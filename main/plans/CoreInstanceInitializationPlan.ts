/**
 * Core Instance Initialization Plan
 *
 * Extracted from NodeOneCore.initOneCoreInstance()
 * Handles ONE.core platform loading and instance initialization.
 *
 * Principles:
 * - Fail fast, no fallbacks
 * - Proper sequence: storage → platform → recipes → instance
 * - Store credentials for reuse
 */

import type { Recipe } from '@refinio/one.core/lib/recipes.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';

export interface CoreInitContext {
  username: string;
  password: string;
  directory: string;
}

export interface CoreInitResult {
  ownerId: SHA256IdHash<Person>;
  email: string;
  instanceName: string;
}

/**
 * Core Instance Initialization Plan
 * Initializes ONE.core platform and instance
 */
export class CoreInstanceInitializationPlan {
  async execute(context: CoreInitContext): Promise<CoreInitResult> {
    console.log('[CoreInstanceInitializationPlan] Initializing ONE.core instance...');

    // Step 1: Ensure storage directory exists
    await this.ensureStorageDirectory(context.directory);

    // Step 2: Load Node.js platform
    await this.loadNodePlatform();

    // Step 3: Import ONE.core modules
    const modules = await this.importCoreModules();

    // Step 4: Close existing instance for clean slate
    this.closeExistingInstance(modules.closeInstance);

    // Step 5: Set storage base directory
    modules.setBaseDirOrName(context.directory);

    // Step 6: Get or create instance credentials
    const credentials = await this.getInstanceCredentials(context.username, context.password, modules.SettingsStore);

    // Step 7: Load recipes
    const recipes = await this.loadRecipes();

    // Step 8: Initialize instance
    await this.initializeInstance(credentials, context.directory, context.password, recipes, modules.initInstance);

    // Step 9: Store credentials if new instance
    await this.storeCredentials(credentials, modules.SettingsStore);

    // Step 10: Get owner ID
    const result = await this.getOwnerInfo(credentials, modules.getInstanceOwnerIdHash);

    console.log('[CoreInstanceInitializationPlan] ✅ ONE.core instance initialized');
    return result;
  }

  private async ensureStorageDirectory(directory: string): Promise<void> {
    console.log('[CoreInstanceInitializationPlan] Ensuring storage directory...');

    const fs = await import('fs');
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      console.log('[CoreInstanceInitializationPlan] Created storage directory:', directory);
    }
  }

  private async loadNodePlatform(): Promise<void> {
    console.log('[CoreInstanceInitializationPlan] Loading Node.js platform...');

    await import('@refinio/one.core/lib/system/load-nodejs.js');

    console.log('[CoreInstanceInitializationPlan] ✅ Node.js platform loaded');
  }

  private async importCoreModules() {
    console.log('[CoreInstanceInitializationPlan] Importing ONE.core modules...');

    const { closeInstance, initInstance, getInstanceOwnerIdHash } = await import('@refinio/one.core/lib/instance.js');
    const { SettingsStore } = await import('@refinio/one.core/lib/system/settings-store.js');
    const { setBaseDirOrName } = await import('@refinio/one.core/lib/system/storage-base.js');

    return {
      closeInstance,
      initInstance,
      getInstanceOwnerIdHash,
      SettingsStore,
      setBaseDirOrName
    };
  }

  private closeExistingInstance(closeInstance: any): void {
    console.log('[CoreInstanceInitializationPlan] Closing existing instance...');

    try {
      closeInstance();
      console.log('[CoreInstanceInitializationPlan] ✅ Closed existing instance');
    } catch (e) {
      // OK if no existing instance
    }
  }

  private async getInstanceCredentials(username: string, password: string, SettingsStore: any) {
    console.log('[CoreInstanceInitializationPlan] Getting instance credentials...');

    // Use DIFFERENT email from browser to enable federation
    const instanceName = `lama-node-${username}`;
    const email = `node-${username}@lama.local`;

    // Check if instance already exists
    const storedInstanceName = await SettingsStore.getItem('instance');
    const storedEmail = await SettingsStore.getItem('email');

    const isNewInstance = !storedInstanceName || !storedEmail;

    return {
      instanceName: storedInstanceName || instanceName,
      email: storedEmail || email,
      isNewInstance
    };
  }

  private async loadRecipes() {
    console.log('[CoreInstanceInitializationPlan] Loading recipes...');

    // Import recipes following one.leute pattern
    const RecipesStable = (await import('@refinio/one.models/lib/recipes/recipes-stable.js')).default;
    const RecipesExperimental = (await import('@refinio/one.models/lib/recipes/recipes-experimental.js')).default;
    const { LamaRecipes } = await import('../recipes/index.js');

    // Import reverse maps
    const { ReverseMapsStable, ReverseMapsForIdObjectsStable } = await import('@refinio/one.models/lib/recipes/reversemaps-stable.js');
    const { ReverseMapsExperimental, ReverseMapsForIdObjectsExperimental } = await import('@refinio/one.models/lib/recipes/reversemaps-experimental.js');

    const allRecipes = [
      ...RecipesStable,
      ...RecipesExperimental,
      ...(LamaRecipes || [])
    ] as Recipe[];

    console.log('[CoreInstanceInitializationPlan] Loaded', allRecipes.length, 'recipes');

    return {
      recipes: allRecipes,
      reverseMaps: new Map([
        ...(ReverseMapsStable || []),
        ...(ReverseMapsExperimental || [])
      ]),
      reverseMapsForIdObjects: new Map([
        ...(ReverseMapsForIdObjectsStable || []),
        ...(ReverseMapsForIdObjectsExperimental || [])
      ])
    };
  }

  private async initializeInstance(
    credentials: any,
    directory: string,
    password: string,
    recipes: any,
    initInstance: any
  ): Promise<void> {
    console.log('[CoreInstanceInitializationPlan] Initializing instance...');

    try {
      await initInstance({
        name: credentials.instanceName,
        email: credentials.email,
        secret: password,
        directory: directory,
        initialRecipes: recipes.recipes,
        initiallyEnabledReverseMapTypes: recipes.reverseMaps,
        initiallyEnabledReverseMapTypesForIdObjects: recipes.reverseMapsForIdObjects,
        storageInitTimeout: 20000
      });

      console.log('[CoreInstanceInitializationPlan] ✅ Instance initialized');
    } catch (error) {
      console.error('[CoreInstanceInitializationPlan] Instance initialization failed:', error);
      throw error;
    }
  }

  private async storeCredentials(credentials: any, SettingsStore: any): Promise<void> {
    if (credentials.isNewInstance) {
      console.log('[CoreInstanceInitializationPlan] Storing instance credentials...');

      await SettingsStore.setItem('instance', credentials.instanceName);
      await SettingsStore.setItem('email', credentials.email);

      console.log('[CoreInstanceInitializationPlan] ✅ Credentials stored');
    }
  }

  private async getOwnerInfo(credentials: any, getInstanceOwnerIdHash: any): Promise<CoreInitResult> {
    console.log('[CoreInstanceInitializationPlan] Getting owner ID...');

    const ownerId = getInstanceOwnerIdHash();
    if (!ownerId) {
      throw new Error('Failed to get instance owner ID after initialization');
    }

    console.log('[CoreInstanceInitializationPlan] ✅ Owner ID retrieved');

    return {
      ownerId,
      email: credentials.email,
      instanceName: credentials.instanceName
    };
  }
}
