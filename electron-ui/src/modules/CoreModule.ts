import LeuteModel from '@refinio/one.models/lib/models/Leute/LeuteModel.js';
import ChannelManager from '@refinio/one.models/lib/models/ChannelManager.js';
import TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';
import ConnectionsModel from '@refinio/one.models/lib/models/ConnectionsModel.js';
import PropertyTreeStore from '@refinio/one.models/lib/models/SettingsModel.js';
import type { Module } from '@refinio/api';

/**
 * CoreModule - ONE.core foundation models
 *
 * Root module with NO dependencies. Provides:
 * - LeuteModel (people/contacts/profiles)
 * - ChannelManager (channel operations)
 * - TopicModel (chat/messaging)
 * - ConnectionsModel (P2P connections)
 * - Settings (encrypted storage)
 */
export class CoreModule implements Module {
  readonly name = 'CoreModule';

  // Demand OneCore to ensure Instance is ready before initializing models
  static demands = [
    { targetType: 'OneCore', required: true }
  ];

  static supplies = [
    { targetType: 'LeuteModel' },
    { targetType: 'ChannelManager' },
    { targetType: 'TopicModel' },
    { targetType: 'ConnectionsModel' },
    { targetType: 'Settings' }
  ];

  private deps: {
    oneCore?: any;
  } = {};

  public leuteModel!: LeuteModel;
  public channelManager!: ChannelManager;
  public topicModel!: TopicModel;
  public connections!: ConnectionsModel;
  public settings!: PropertyTreeStore;

  constructor(private commServerUrl: string) {}

  async init(): Promise<void> {
    if (!this.deps.oneCore) {
      throw new Error('[CoreModule] OneCore dependency not injected - Instance not ready');
    }

    try {
      console.log('[CoreModule] OneCore dependency injected - Instance ready');

      // Create ONE.core models
      this.leuteModel = new LeuteModel(this.commServerUrl, false);
      this.channelManager = new ChannelManager(this.leuteModel);
      this.topicModel = new TopicModel(this.channelManager, this.leuteModel);
      this.connections = new ConnectionsModel(this.leuteModel, {
        commServerUrl: this.commServerUrl
      });
      this.settings = new PropertyTreeStore('lama.browser.settings');

      // Initialize all models (state machine transitions)
      await this.leuteModel.init();
      await this.channelManager.init();
      await this.topicModel.init();
      await this.connections.init();
      await this.settings.init();

      // Create the 'lama' channel for application-level data (LLM configs, etc.)
      try {
        await this.channelManager.createChannel('lama');
        console.log('[CoreModule] Created \'lama\' channel for application data');
      } catch (error: any) {
        // Channel might already exist - check error
        if (error.message?.includes('already exists')) {
          console.log('[CoreModule] \'lama\' channel already exists');
        } else {
          throw error;
        }
      }

      console.log('[CoreModule] Initialized');
    } catch (error) {
      console.error('[CoreModule] Initialization failed:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Shutdown in reverse order
      if (this.connections) await this.connections.shutdown?.();
      if (this.topicModel) await this.topicModel.shutdown?.();
      if (this.channelManager) await this.channelManager.shutdown?.();
      if (this.leuteModel) await this.leuteModel.shutdown?.();
      if (this.settings) await this.settings.shutdown?.();

      console.log('[CoreModule] Shutdown complete');
    } catch (error) {
      console.error('[CoreModule] Shutdown failed:', error);
      throw error;
    }
  }

  setDependency(targetType: string, instance: any): void {
    const key = targetType.charAt(0).toLowerCase() + targetType.slice(1);
    this.deps[key as keyof typeof this.deps] = instance;
  }

  emitSupplies(registry: any): void {
    registry.supply({ targetType: 'LeuteModel', instance: this.leuteModel });
    registry.supply({ targetType: 'ChannelManager', instance: this.channelManager });
    registry.supply({ targetType: 'TopicModel', instance: this.topicModel });
    registry.supply({ targetType: 'ConnectionsModel', instance: this.connections });
    registry.supply({ targetType: 'Settings', instance: this.settings });
  }
}
