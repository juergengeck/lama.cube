/**
 * Settings Handler for Refinio API
 *
 * Provides Settings functionality through the refinio.api QUIC interface.
 * This allows web clients, refinio.cli, and other tools to access/update user settings.
 * Uses SettingsPlan from settings.core for all operations.
 */

import type { SettingsPlan } from '@refinio/settings.core';

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
  settingsPlan?: SettingsPlan;
  [key: string]: any;
}

/**
 * REST API Handler for Settings
 *
 * Exposes SettingsPlan through HTTP-like endpoints for web clients
 * and external tools that cannot use Electron IPC.
 */
export class SettingsHandler {
  public nodeOneCore: NodeOneCore;
  public name: string;
  public version: string;

  constructor(nodeOneCore: NodeOneCore) {
    this.nodeOneCore = nodeOneCore;
    this.name = 'settings';
    this.version = '1.0.0';
  }

  /**
   * Get SettingsPlan from nodeOneCore
   */
  private getPlan(): SettingsPlan {
    const plan = this.nodeOneCore.settingsPlan;
    if (!plan) {
      throw new Error('[SettingsHandler] SettingsPlan not initialized');
    }
    return plan;
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
  async getSettings(_request: APIRequest): Promise<APIResponse> {
    try {
      const plan = this.getPlan();
      const result = await plan.getAll();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: result.settings
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
      const plan = this.getPlan();
      await plan.updateAISettings(request.body);
      const result = await plan.getAll();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: result.settings
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
      const plan = this.getPlan();
      await plan.updateUISettings(request.body);
      const result = await plan.getAll();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: result.settings
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
      const plan = this.getPlan();
      await plan.updateSection({ moduleId: 'proposals', values: request.body });
      const result = await plan.getAll();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: result.settings
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
      const plan = this.getPlan();
      const { modelId } = request.body;

      await plan.updateAISettings({
        defaultModelId: modelId || undefined
      });
      const result = await plan.getAll();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: result.settings
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
      const plan = this.getPlan();
      const { theme } = request.body;

      if (theme !== 'dark' && theme !== 'light') {
        throw new Error('theme must be "dark" or "light"');
      }

      await plan.updateUISettings({ theme });
      const result = await plan.getAll();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: result.settings
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
   * Update multiple sections at once (batch update)
   *
   * Body: { ai?: ..., ui?: ..., network?: ..., privacy?: ... }
   */
  async updateAllSettings(request: APIRequest): Promise<APIResponse> {
    try {
      const plan = this.getPlan();
      const updates = request.body;

      // Update each section that was provided
      if (updates.ai) {
        await plan.updateAISettings(updates.ai);
      }
      if (updates.ui) {
        await plan.updateUISettings(updates.ui);
      }
      if (updates.network) {
        await plan.updateNetworkSettings(updates.network);
      }
      if (updates.privacy) {
        await plan.updatePrivacySettings(updates.privacy);
      }
      if (updates.proposals) {
        await plan.updateSection({ moduleId: 'proposals', values: updates.proposals });
      }

      const result = await plan.getAll();

      return {
        statusCode: 200,
        body: {
          success: true,
          data: result.settings
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
