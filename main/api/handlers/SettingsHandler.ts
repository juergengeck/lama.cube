/**
 * Settings Handler for Refinio API
 *
 * Provides UserSettings functionality through the refinio.api QUIC interface.
 * This allows web clients, refinio.cli, and other tools to access/update user settings.
 */

import { UserSettingsManager } from '../../core/user-settings-manager.js';
import type { UserSettings, AISettings, UISettings, ProposalSettings } from '../../types/user-settings-types.js';

interface RequestParams {
  [key: string]: string;
}

interface RequestQuery {
  [key: string]: string;
}

interface APIRequest {
  params: RequestParams;
  query: RequestQuery;
  body: any;
}

interface APIResponse {
  statusCode: number;
  body: {
    success: boolean;
    data?: any;
    error?: string;
  };
}

interface NodeOneCore {
  email?: string;
  [key: string]: any;
}

/**
 * REST API Handler for UserSettings
 *
 * Exposes UserSettingsManager through HTTP-like endpoints for web clients
 * and external tools that cannot use Electron IPC.
 */
export class SettingsHandler {
  public nodeOneCore: NodeOneCore;
  public settingsManager: UserSettingsManager | null = null;
  public name: string;
  public version: string;

  constructor(nodeOneCore: NodeOneCore) {
    this.nodeOneCore = nodeOneCore;
    this.name = 'settings';
    this.version = '1.0.0';
  }

  /**
   * Lazy initialization of settings manager
   * (waits until nodeOneCore has email)
   */
  private getManager(): UserSettingsManager {
    if (!this.settingsManager) {
      if (!this.nodeOneCore.email) {
        throw new Error('[SettingsHandler] NodeOneCore not initialized - no user email');
      }
      this.settingsManager = new UserSettingsManager(
        this.nodeOneCore,
        this.nodeOneCore.email,
        this.nodeOneCore.ownerId
      );
    }
    return this.settingsManager;
  }

  /**
   * Get handler configuration for refinio.api
   */
  getConfig() {
    return {
      name: this.name,
      version: this.version,
      endpoints: {
        // Get all settings
        'GET /settings': this.getSettings.bind(this),

        // Update settings by section
        'PUT /settings/ai': this.updateAI.bind(this),
        'PUT /settings/ui': this.updateUI.bind(this),
        'PUT /settings/proposals': this.updateProposals.bind(this),

        // Convenience endpoints
        'PUT /settings/default-model': this.setDefaultModel.bind(this),
        'PUT /settings/theme': this.setTheme.bind(this),

        // Batch update (all sections at once)
        'PUT /settings': this.updateAllSettings.bind(this)
      }
    };
  }

  /**
   * GET /settings
   * Retrieve all user settings
   */
  async getSettings(request: APIRequest): Promise<APIResponse> {
    try {
      const manager = this.getManager();
      const settings = await manager.getSettings();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: settings
        }
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * PUT /settings/ai
   * Update AI settings
   *
   * Body: Partial<AISettings>
   */
  async updateAI(request: APIRequest): Promise<APIResponse> {
    try {
      const manager = this.getManager();
      const updates: Partial<AISettings> = request.body;

      const settings = await manager.updateAI(updates);

      return {
        statusCode: 200,
        body: {
          success: true,
          data: settings
        }
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * PUT /settings/ui
   * Update UI settings
   *
   * Body: Partial<UISettings>
   */
  async updateUI(request: APIRequest): Promise<APIResponse> {
    try {
      const manager = this.getManager();
      const updates: Partial<UISettings> = request.body;

      const settings = await manager.updateUI(updates);

      return {
        statusCode: 200,
        body: {
          success: true,
          data: settings
        }
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * PUT /settings/proposals
   * Update proposal settings
   *
   * Body: Partial<ProposalSettings>
   */
  async updateProposals(request: APIRequest): Promise<APIResponse> {
    try {
      const manager = this.getManager();
      const updates: Partial<ProposalSettings> = request.body;

      const settings = await manager.updateProposals(updates);

      return {
        statusCode: 200,
        body: {
          success: true,
          data: settings
        }
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * PUT /settings/default-model
   * Convenience endpoint to set default AI model
   *
   * Body: { modelId: string | null }
   */
  async setDefaultModel(request: APIRequest): Promise<APIResponse> {
    try {
      const manager = this.getManager();
      const { modelId } = request.body;

      const settings = await manager.updateAI({
        defaultModelId: modelId || undefined
      });

      return {
        statusCode: 200,
        body: {
          success: true,
          data: settings
        }
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * PUT /settings/theme
   * Convenience endpoint to set UI theme
   *
   * Body: { theme: 'dark' | 'light' }
   */
  async setTheme(request: APIRequest): Promise<APIResponse> {
    try {
      const manager = this.getManager();
      const { theme } = request.body;

      if (theme !== 'dark' && theme !== 'light') {
        throw new Error('theme must be "dark" or "light"');
      }

      const settings = await manager.updateUI({ theme });

      return {
        statusCode: 200,
        body: {
          success: true,
          data: settings
        }
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * PUT /settings
   * Update all settings at once (batch update)
   *
   * Body: Partial<Omit<UserSettings, '$type$' | 'userEmail'>>
   */
  async updateAllSettings(request: APIRequest): Promise<APIResponse> {
    try {
      const manager = this.getManager();
      const updates = request.body;

      const settings = await manager.updateSettings(updates);

      return {
        statusCode: 200,
        body: {
          success: true,
          data: settings
        }
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: {
          success: false,
          error: (error as Error).message
        }
      };
    }
  }
}

export default SettingsHandler;
