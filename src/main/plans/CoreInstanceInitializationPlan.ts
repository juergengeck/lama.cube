/**
 * Core Instance Initialization Plan
 *
 * Uses MultiUser from one.models for proper recipe handling.
 * MultiUser defaults to RecipesStable + RecipesExperimental when no recipes specified.
 * We extend with custom recipes from lama packages.
 *
 * Principles:
 * - Use MultiUser, not direct initInstance calls
 * - Fail fast, no fallbacks
 * - Store credentials for reuse
 */

import type { Recipe, Instance } from '@refinio/one.core/lib/recipes.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';

import fs from 'fs';
import '@refinio/one.core/lib/system/load-nodejs.js';
import { closeInstance, getInstanceOwnerIdHash, getInstanceIdHash } from '@refinio/one.core/lib/instance.js';
import { LamaRecipes, LamaReverseMaps, LamaReverseMapsForIdObjects } from '../recipes/index.js';
import { CubeCoreRecipes } from '@refinio/cube.core/recipes/index.js';
import { MeaningCoreRecipes } from '@refinio/meaning.core/recipes/index.js';
import { AllRecipes as TrustCoreRecipes } from '@refinio/trust.core/recipes/index.js';
import { WhatsAppRecipes } from '@refinio/chat.baileys/recipes/index.js';
import { OneKnowledgeRecipes } from '@refinio/one.knowledge/lib/recipes/index.js';
import { SettingsRecipes } from '@refinio/settings.core/recipes/InstanceSettingsRecipe.js';
import { DeviceCoreRecipes, DeviceCoreReverseMaps } from '@refinio/device.core';
import MultiUser from '@refinio/one.models/lib/models/Authenticator/MultiUser.js';
import RecipesStable from '@refinio/one.models/lib/recipes/recipes-stable.js';
import RecipesExperimental from '@refinio/one.models/lib/recipes/recipes-experimental.js';
import { ReverseMapsStable, ReverseMapsForIdObjectsStable } from '@refinio/one.models/lib/recipes/reversemaps-stable.js';
import { ReverseMapsExperimental, ReverseMapsForIdObjectsExperimental } from '@refinio/one.models/lib/recipes/reversemaps-experimental.js';

export interface CoreInitContext {
  username: string;
  password: string;
  directory: string;
}

export interface CoreInitResult {
  ownerId: SHA256IdHash<Person>;
  instanceId: SHA256IdHash<Instance>;
  email: string;
  instanceName: string;
}

/**
 * Core Instance Initialization Plan
 * Initializes ONE.core platform and instance using MultiUser
 */
export class CoreInstanceInitializationPlan {
  async execute(context: CoreInitContext): Promise<CoreInitResult> {
    console.log('[CoreInstanceInitializationPlan] Initializing ONE.core instance...');

    // Step 1: Ensure storage directory exists
    await this.ensureStorageDirectory(context.directory);

    // Step 2: Load Node.js platform
    this.loadNodePlatform();

    // Step 3: Close any existing instance
    await this.closeExistingInstance();

    // Step 4: Get instance credentials
    const credentials = this.getInstanceCredentials(context.username);

    // Step 5: Load custom recipes (beyond one.models defaults)
    const customRecipes = await this.loadCustomRecipes();

    // Step 6: Initialize instance via MultiUser
    await this.initializeWithMultiUser(context, credentials, customRecipes);

    // Step 7: Get owner and instance IDs
    const result = await this.getOwnerInfo(credentials);

    console.log('[CoreInstanceInitializationPlan] ✅ ONE.core instance initialized');
    return result;
  }

  private async ensureStorageDirectory(directory: string): Promise<void> {
    console.log('[CoreInstanceInitializationPlan] Ensuring storage directory...');

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
      console.log('[CoreInstanceInitializationPlan] Created storage directory:', directory);
    }
  }

  private loadNodePlatform(): void {
    console.log('[CoreInstanceInitializationPlan] Loading Node.js platform...');

    // Static import of '@refinio/one.core/lib/system/load-nodejs.js' at top of file handles this

    console.log('[CoreInstanceInitializationPlan] ✅ Node.js platform loaded');
  }

  private async closeExistingInstance(): Promise<void> {
    console.log('[CoreInstanceInitializationPlan] Closing existing instance...');

    try {
      closeInstance();
      console.log('[CoreInstanceInitializationPlan] ✅ Closed existing instance');
    } catch (e) {
      // OK if no existing instance
    }
  }

  private getInstanceCredentials(username: string) {
    console.log('[CoreInstanceInitializationPlan] Getting instance credentials for user:', username);

    const instanceName = `lama-${username}`;
    const email = `${username}@lama.local`;

    return { instanceName, email };
  }

  /**
   * Load custom recipes that extend the one.models defaults.
   * MultiUser defaults to RecipesStable + RecipesExperimental.
   * We add package-specific recipes on top.
   */
  private async loadCustomRecipes(): Promise<Recipe[]> {
    console.log('[CoreInstanceInitializationPlan] Loading custom recipes...');

    const customRecipes = [
      ...(LamaRecipes || []),
      ...(CubeCoreRecipes || []),
      ...(MeaningCoreRecipes || []),
      ...(OneKnowledgeRecipes || []),
      ...(TrustCoreRecipes || []),
      ...(WhatsAppRecipes || []),
      ...(SettingsRecipes || []),
      ...(DeviceCoreRecipes || [])
    ] as Recipe[];

    console.log('[CoreInstanceInitializationPlan] Loaded', customRecipes.length, 'custom recipes');
    return customRecipes;
  }

  private async initializeWithMultiUser(
    context: CoreInitContext,
    credentials: { instanceName: string; email: string },
    customRecipes: Recipe[]
  ): Promise<void> {
    console.log('[CoreInstanceInitializationPlan] Initializing instance via MultiUser...');

    // Combine default + custom recipes
    const allRecipes = [
      ...RecipesStable,
      ...RecipesExperimental,
      ...customRecipes
    ];

    // Check for duplicates
    const recipeNames = allRecipes.map((r) => r.name).filter(Boolean);
    const nameCounts = new Map<string, number>();
    for (const name of recipeNames) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    const duplicates = [...nameCounts.entries()].filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.error('[CoreInstanceInitializationPlan] ❌ DUPLICATE RECIPES DETECTED:');
      for (const [name, count] of duplicates) {
        console.error(`  - "${name}" appears ${count} times`);
      }
      throw new Error(`Duplicate recipes detected: ${duplicates.map(([n]) => n).join(', ')}`);
    }

    console.log('[CoreInstanceInitializationPlan] Total recipes:', allRecipes.length);

    // Create MultiUser instance with combined recipes
    const multiUser = new MultiUser({
      directory: context.directory,
      recipes: allRecipes,
      reverseMaps: new Map([
        ...(ReverseMapsStable || []),
        ...(ReverseMapsExperimental || []),
        ...(LamaReverseMaps || []),
        ...(DeviceCoreReverseMaps || [])
      ]),
      reverseMapsForIdObjects: new Map([
        ...(ReverseMapsForIdObjectsStable || []),
        ...(ReverseMapsForIdObjectsExperimental || []),
        ...(LamaReverseMapsForIdObjects || [])
      ]),
      storageInitTimeout: 20000
    });

    // Login or register
    await multiUser.loginOrRegister(
      credentials.email,
      context.password,
      credentials.instanceName
    );

    console.log('[CoreInstanceInitializationPlan] ✅ Instance initialized via MultiUser');
  }

  private async getOwnerInfo(credentials: { instanceName: string; email: string }): Promise<CoreInitResult> {
    console.log('[CoreInstanceInitializationPlan] Getting owner and instance IDs...');

    const ownerId = getInstanceOwnerIdHash();
    if (!ownerId) {
      throw new Error('Failed to get instance owner ID after initialization');
    }

    const instanceId = getInstanceIdHash();
    if (!instanceId) {
      throw new Error('Failed to get instance ID after initialization');
    }

    console.log('[CoreInstanceInitializationPlan] ✅ Owner ID and Instance ID retrieved');

    return {
      ownerId,
      instanceId,
      email: credentials.email,
      instanceName: credentials.instanceName
    };
  }
}
