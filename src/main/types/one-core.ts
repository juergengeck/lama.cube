import type { ChannelManager, ConnectionsModel, LeuteModel } from '@refinio/one.models/lib/models/index.js';
import type TopicModel from '@refinio/one.models/lib/models/Chat/TopicModel.js';
import type TopicRoom from '@refinio/one.models/lib/models/Chat/TopicRoom.js';
import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';
import type { Person } from '@refinio/one.core/lib/recipes.js';
import type TopicAnalysisModel from '@refinio/lama.core/one-ai/models/TopicAnalysisModel.js';
import type { LLMObjectManager } from '@refinio/lama.core/models/LLMObjectManager.js';
import type { AIAssistantPlan } from '@refinio/lama.core/plans/AIAssistantPlan.js';
import type { SettingsPlan } from '@refinio/settings.core/plans/SettingsPlan.js';
import type { DevicePlan } from '@refinio/device.core/plans/DevicePlan.js';
import type TopicGroupManagerImpl from '../core/topic-group-manager.js';
import type { MemoryStorageHandler } from '../services/memory-storage-handler.js';
import type { CAPlan } from '@refinio/api/plans/CAPlan.js';
import type SingleUserNoAuth from '@refinio/one.models/lib/models/Authenticator/SingleUserNoAuth.js';
// FederationAPI is typed loosely since the class declares it as unknown
// and it's only constructed at runtime

// LLM Manager type (local service, not from ONE.core)
export interface LLMManager {
  getAvailableModels(): any[];
  chat(messages: any[], modelId: string): Promise<string>;
  chatWithAnalysis?(messages: any[], modelId: string, options?: any): Promise<any>;
  registerPrivateVariantForModel?(modelId: string): void;
  getModel?(modelId: string): any;
}

// Main NodeOneCore interface
export interface NodeOneCore {
  // Core state
  initialized: boolean;
  initEpoch: number;
  instanceName: string;
  isReady: boolean;
  ownerId: SHA256IdHash<Person>;

  // ONE.core models
  channelManager: ChannelManager;
  connectionsModel: ConnectionsModel;
  leuteModel: LeuteModel;
  topicModel: TopicModel;
  oneAuth: SingleUserNoAuth | null;

  // Plans
  settingsPlan?: SettingsPlan;
  devicePlan?: DevicePlan;
  caPlan?: CAPlan;
  trustPlan?: any; // TrustPlan type not yet exported from trust.core
  paranoiaLevel?: 0 | 1;

  // Instance/device
  instanceId?: string;
  localInstanceId?: string;
  localDeviceIdHash?: SHA256IdHash<any>;

  // AI/LLM
  aiAssistantModel?: AIAssistantPlan;
  llmManager?: LLMManager;
  llmObjectManager?: LLMObjectManager;
  topicAnalysisModel?: TopicAnalysisModel;
  topicGroupManager?: TopicGroupManagerImpl;

  // Memory
  memoryStorageHandler?: MemoryStorageHandler;
  chatMemoryHandler?: any; // ChatMemoryPlan from memory.core
  memoryPlan?: any; // MemoryPlan from memory.core
  sessionMemoryPlan?: any; // SessionMemoryPlan from memory.core

  // Services
  commServerUrl?: string;
  contentSharing?: any;
  assemblyManager?: any; // AssemblyManager from assembly.core
  accessRightsManager?: any;
  planRegistry?: any;
  federationAPI?: any;
  contextEnrichmentService?: any; // Optional context enrichment for AI prompts
  // userSettingsManager is not a real property - code should use settingsPlan instead

  // Methods
  getInfo(): { initialized: boolean; ownerId?: SHA256IdHash<Person> };
  initialize(username: string, password: string, onProgress?: (stage: string, percent: number, message: string) => void): Promise<{ success: boolean; ownerId?: string; error?: string }>;
  shutdown(): Promise<void>;
  setState(key: string, value: any): Promise<void>;
  grantPeerAccess(remotePersonId: SHA256IdHash<Person>, context?: string): Promise<void>;
  grantAIChannelAccessToAllPeers(): Promise<void>;
  grantAIAccessToPeer(targetPersonId: SHA256IdHash<Person>): Promise<void>;
  getCAPlan(): Promise<CAPlan | undefined>;
  updateDiscoveryDisplayName(newName: string): void;
}

// Re-export the actual TopicModel and TopicRoom from one.models
export type { TopicModel, TopicRoom };
