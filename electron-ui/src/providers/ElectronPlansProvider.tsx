/**
 * ElectronPlansProvider - IPC Wrappers for LAMA Plans
 *
 * Wraps Electron IPC calls to match Plan interfaces from @chat/core and @lama/core.
 * This allows lama.cube to use the SAME UI components as lama.browser by providing
 * Plan implementations via IPC instead of direct access.
 *
 * Architecture:
 * - UI Components: Import from lama.browser (SHARED)
 * - Plan Interfaces: Defined in @chat/core, @lama/core (SHARED)
 * - Plan Implementations: Platform-specific (browser: direct, cube: IPC wrappers)
 *
 * See: ui.core/ARCHITECTURE.md for complete architecture documentation
 */

import { ReactNode, useState, useEffect } from 'react'
import { PlansProvider, type LAMAPlansContext, type MemoryPlan, type LocalModelsPlan } from '@ui/core'
import type { ContactsPlan } from '@chat/core/plans/ContactsPlan.js'
import type { ChatPlan } from '@chat/core/plans/ChatPlan.js'
import type { AIPlan } from '@lama/core/plans/AIPlan.js'
import type { AIAssistantPlan } from '@lama/core/plans/AIAssistantPlan.js'
import type { LLMConfigPlan } from '@lama/core/plans/LLMConfigPlan.js'
import type { TopicAnalysisPlan } from '@lama/core/plans/TopicAnalysisPlan.js'
import type { ProposalsPlan } from '@lama/core/plans/ProposalsPlan.js'
import type { KeywordDetailPlan } from '@lama/core/plans/KeywordDetailPlan.js'
import type { WordCloudSettingsPlan } from '@lama/core/plans/WordCloudSettingsPlan.js'
import type { CryptoPlan } from '@lama/core/plans/CryptoPlan.js'
import type { AuditPlan } from '@lama/core/plans/AuditPlan.js'
import type { JournalPlan } from '@lama/core/plans/JournalPlan.js'
import type { ExportPlan } from '@chat/core/plans/ExportPlan.js'
import type { FeedForwardPlan } from '@chat/core/plans/FeedForwardPlan.js'
import type { ConnectionPlan } from '@lama/connection.core'
import type { TrustPlan } from '@trust/core/plans/TrustPlan.js'
import type { CubePlan } from '@lama/core/plans/CubePlan.js'
import type { TransportPlan } from '@transport/core'

/**
 * IPC Wrapper for ContactsPlan
 * Maps ContactsPlan interface methods to Electron IPC calls
 */
const contactsPlan: ContactsPlan = {
  async getContacts() {
    return await window.electronAPI.invoke('contacts:list')
  },

  async getContactsWithTrust() {
    return await window.electronAPI.invoke('contacts:list-with-trust')
  },

  async getPendingContacts() {
    return await window.electronAPI.invoke('contacts:pending:list')
  },

  async getPendingContact(pendingId: string) {
    return await window.electronAPI.invoke('contacts:pending:get', pendingId)
  },

  async acceptContact(personId: string, options?: any) {
    return await window.electronAPI.invoke('contacts:accept', personId, options)
  },

  async blockContact(personId: string, reason: string) {
    return await window.electronAPI.invoke('contacts:block', personId, reason)
  },

  async rejectContact(pendingId: string, reason: string) {
    return await window.electronAPI.invoke('contacts:pending:reject', pendingId, reason)
  },

  async addContact(personInfo: { name: string; email: string }) {
    return await window.electronAPI.invoke('contacts:add', personInfo)
  },

  async removeContact(contactId: string) {
    return await window.electronAPI.invoke('contacts:remove', contactId)
  },

  async revokeContactVC(personId: string) {
    return await window.electronAPI.invoke('contacts:revoke', personId)
  },

  async hasPersonName() {
    return await window.electronAPI.invoke('onecore:hasPersonName')
  },

  async setPersonName(params: { name: string }) {
    return await window.electronAPI.invoke('onecore:setPersonName', params)
  },

  async createInvitation() {
    return await window.electronAPI.invoke('invitation:create')
  },

  async uploadAvatar(request: { dataUrl: string }) {
    return await window.electronAPI.invoke('contacts:uploadAvatar', request)
  },

  async getProfile(request: { personId: string }) {
    return await window.electronAPI.invoke('contacts:getProfile', request)
  },

  async getProfilesForSomeone(request: { personId: string }) {
    return await window.electronAPI.invoke('contacts:getProfilesForSomeone', request)
  },

  async updateProfile(request: any) {
    return await window.electronAPI.invoke('contacts:updateProfile', request)
  },

  async getAvatarDataUrl(request: { blobHash: string }) {
    return await window.electronAPI.invoke('contacts:getAvatarDataUrl', request)
  },

  async getLamaAvatarConfig(request: { personId: string; name?: string }) {
    return await window.electronAPI.invoke('contacts:getLamaAvatarConfig', request)
  },

  async saveLamaAvatarConfig(request: { personId: string; name?: string; lamaConfig: any }) {
    return await window.electronAPI.invoke('contacts:saveLamaAvatarConfig', request)
  }
} as ContactsPlan

/**
 * IPC Wrapper for ChatPlan
 * Maps ChatPlan interface methods to Electron IPC calls
 */
const chatPlan: ChatPlan = {
  async getConversations(params?: any) {
    return await window.electronAPI.invoke('chat:getConversations', params)
  },

  async getMessages(params: { conversationId: string; limit?: number; offset?: number }) {
    return await window.electronAPI.invoke('chat:getMessages', params)
  },

  async sendMessage(params: { conversationId: string; text: string; attachments?: any[] }) {
    return await window.electronAPI.invoke('chat:sendMessage', params)
  },

  async createConversation(params: any) {
    return await window.electronAPI.invoke('chat:createConversation', params)
  },

  async deleteConversation(conversationId: string) {
    return await window.electronAPI.invoke('chat:deleteConversation', conversationId)
  },

  async renameConversation(conversationId: string, newName: string) {
    return await window.electronAPI.invoke('chat:renameConversation', conversationId, newName)
  },

  async addParticipants(params: { conversationId: string; participantIds: string[] }) {
    return await window.electronAPI.invoke('chat:addParticipants', params)
  },

  async removeParticipant(params: { conversationId: string; participantId: string }) {
    return await window.electronAPI.invoke('chat:removeParticipant', params)
  },

  async getConversationDetails(conversationId: string) {
    return await window.electronAPI.invoke('chat:getConversationDetails', conversationId)
  },

  async exportMessageCredential(params: { messageId: string }) {
    const response = await window.electronAPI.invoke('chat:exportMessageCredential', params)
    return response
  }
} as ChatPlan

/**
 * IPC Wrapper for AIPlan
 */
const aiPlan: AIPlan = {
  async chat(params: any) {
    return await window.electronAPI.invoke('ai:chat', params)
  },

  async streamChat(params: any) {
    return await window.electronAPI.invoke('ai:stream-chat', params)
  },

  async stopStreaming(params: { topicId: string }) {
    return await window.electronAPI.invoke('ai:stopStreaming', params)
  },

  async getAvailableModels() {
    return await window.electronAPI.invoke('ai:getAvailableModels')
  },

  async getDefaultModel() {
    return await window.electronAPI.invoke('ai:getDefaultModel')
  },

  async setDefaultModel(modelId: string) {
    return await window.electronAPI.invoke('ai:setDefaultModel', modelId)
  },

  async isAITopic(topicId: string) {
    const response = await window.electronAPI.invoke('ai:isAITopic', { topicId })
    return response.success ? response.isAI : false
  }
} as AIPlan

/**
 * IPC Wrapper for AIAssistantPlan
 */
const aiAssistantPlan: AIAssistantPlan = {
  async getAIContacts() {
    return await window.electronAPI.invoke('ai:getAIContacts')
  },

  async createAIContact(params: any) {
    return await window.electronAPI.invoke('ai:createAIContact', params)
  },

  async updateAIContact(params: any) {
    return await window.electronAPI.invoke('ai:updateAIContact', params)
  },

  async deleteAIContact(contactId: string) {
    return await window.electronAPI.invoke('ai:deleteAIContact', contactId)
  }
} as AIAssistantPlan

/**
 * IPC Wrapper for LLMConfigPlan
 */
const llmConfigPlan: LLMConfigPlan & {
  getAvailableModels: () => Promise<any>
  discoverOllamaModels: (params?: { serverUrl?: string }) => Promise<any>
  discoverClaudeModels: () => Promise<any>
} = {
  async getAllConfigs() {
    return await window.electronAPI.invoke('llmConfig:getAll')
  },

  async getConfig(modelId: string) {
    return await window.electronAPI.invoke('llmConfig:get', modelId)
  },

  async setConfig(params: any) {
    return await window.electronAPI.invoke('llmConfig:set', params)
  },

  async deleteConfig(modelId: string) {
    return await window.electronAPI.invoke('llmConfig:delete', modelId)
  },

  async testConnection(modelId: string) {
    return await window.electronAPI.invoke('llmConfig:testConnection', modelId)
  },

  async getAvailableModels(params?: any) {
    return await window.electronAPI.invoke('ai:getModels', params)
  },

  async discoverOllamaModels(params?: { serverUrl?: string }) {
    const result = await window.electronAPI.invoke('ai:discoverOllamaModels', params)
    return result
  },

  async discoverClaudeModels() {
    const result = await window.electronAPI.invoke('ai:discoverClaudeModels')
    return result
  }
} as any

/**
 * IPC Wrapper for TopicAnalysisPlan
 */
const topicAnalysisPlan: TopicAnalysisPlan = {
  async analyzeMessages(params: any) {
    return await window.electronAPI.invoke('topicAnalysis:analyzeMessages', params)
  },

  async getSubjects(params: { topicId: string; includeArchived?: boolean }) {
    return await window.electronAPI.invoke('topicAnalysis:getSubjects', params)
  },

  async getSummary(params: { topicId: string; version?: number; includeHistory?: boolean }) {
    return await window.electronAPI.invoke('topicAnalysis:getSummary', params)
  },

  async updateSummary(params: { topicId: string; content?: string; changeReason?: string; autoGenerate?: boolean }) {
    return await window.electronAPI.invoke('topicAnalysis:updateSummary', params)
  },

  async extractKeywords(params: { text: string; limit?: number }) {
    return await window.electronAPI.invoke('topicAnalysis:extractKeywords', params)
  },

  async getKeywords(params: { topicId: string; limit?: number }) {
    return await window.electronAPI.invoke('topicAnalysis:getKeywords', params)
  },

  async mergeSubjects(params: any) {
    return await window.electronAPI.invoke('topicAnalysis:mergeSubjects', params)
  },

  async extractRealtimeKeywords(params: { text: string; existingKeywords?: any[]; maxKeywords?: number }) {
    return await window.electronAPI.invoke('topicAnalysis:extractRealtimeKeywords', params)
  }
} as TopicAnalysisPlan

/**
 * IPC Wrapper for ProposalsPlan
 */
const proposalsPlan: ProposalsPlan = {
  async getForTopic(topicId: string) {
    return await window.electronAPI.invoke('proposals:getForTopic', topicId)
  },

  async updateConfig(config: any) {
    return await window.electronAPI.invoke('proposals:updateConfig', config)
  },

  async getConfig() {
    return await window.electronAPI.invoke('proposals:getConfig')
  },

  async dismiss(params: any) {
    return await window.electronAPI.invoke('proposals:dismiss', params)
  },

  async share(params: any) {
    return await window.electronAPI.invoke('proposals:share', params)
  },

  async getDetails(params: any) {
    return await window.electronAPI.invoke('proposals:getDetails', params)
  }
} as ProposalsPlan

/**
 * IPC Wrapper for KeywordDetailPlan
 */
const keywordDetailPlan: KeywordDetailPlan = {
  async getKeywordDetails(keyword: string) {
    return await window.electronAPI.invoke('keywordDetail:get', keyword)
  },

  async getRelatedKeywords(keyword: string) {
    return await window.electronAPI.invoke('keywordDetail:getRelated', keyword)
  }
} as KeywordDetailPlan

/**
 * IPC Wrapper for WordCloudSettingsPlan
 */
const wordCloudSettingsPlan: WordCloudSettingsPlan = {
  async getSettings() {
    return await window.electronAPI.invoke('wordCloudSettings:get')
  },

  async updateSettings(settings: any) {
    return await window.electronAPI.invoke('wordCloudSettings:update', settings)
  }
} as WordCloudSettingsPlan

/**
 * IPC Wrapper for CryptoPlan
 */
const cryptoPlan: CryptoPlan = {
  async generateKeyPair() {
    return await window.electronAPI.invoke('crypto:generateKeyPair')
  },

  async sign(data: any) {
    return await window.electronAPI.invoke('crypto:sign', data)
  },

  async verify(params: any) {
    return await window.electronAPI.invoke('crypto:verify', params)
  },

  async encrypt(params: any) {
    return await window.electronAPI.invoke('crypto:encrypt', params)
  },

  async decrypt(params: any) {
    return await window.electronAPI.invoke('crypto:decrypt', params)
  }
} as CryptoPlan

/**
 * IPC Wrapper for AuditPlan
 */
const auditPlan: AuditPlan = {
  async logEvent(event: any) {
    return await window.electronAPI.invoke('audit:logEvent', event)
  },

  async getAuditLog(params?: any) {
    return await window.electronAPI.invoke('audit:getLog', params)
  },

  async getAuditorDetails(params: { auditorId: string }) {
    return await window.electronAPI.invoke('audit:getAuditorDetails', params)
  },

  async generateQR(params: { messageHash: string; messageVersion?: number; topicId?: string; attestationType?: string }) {
    return await window.electronAPI.invoke('audit:generateQR', params)
  },

  async getAttestationStatus(params: { messageHash: string }) {
    return await window.electronAPI.invoke('audit:getAttestationStatus', params)
  }
} as AuditPlan

/**
 * IPC Wrapper for JournalPlan
 */
const journalPlan: JournalPlan = {
  async getEntries(params?: any) {
    return await window.electronAPI.invoke('journal:getEntries', params)
  },

  async createEntry(entry: any) {
    return await window.electronAPI.invoke('journal:createEntry', entry)
  }
} as JournalPlan

/**
 * IPC Wrapper for ExportPlan
 */
const exportPlan: ExportPlan = {
  async exportConversation(params: any) {
    return await window.electronAPI.invoke('export:conversation', params)
  },

  async exportHTML(params: any) {
    return await window.electronAPI.invoke('export:htmlWithMicrodata', params)
  },

  async exportMessage(params: { format: string; content: string; metadata: any }) {
    return await window.electronAPI.invoke('export:message', params)
  }
} as ExportPlan

/**
 * IPC Wrapper for FeedForwardPlan
 */
const feedForwardPlan: FeedForwardPlan = {
  async shareContext(params: any) {
    return await window.electronAPI.invoke('feedForward:shareContext', params)
  }
} as FeedForwardPlan

/**
 * IPC Wrapper for ConnectionPlan
 */
const connectionPlan: ConnectionPlan = {
  async getInstances() {
    return await window.electronAPI.invoke('connection:getInstances')
  },

  async createPairingInvitation(params?: any) {
    return await window.electronAPI.invoke('connection:createPairingInvitation', params)
  },

  async createWebRTCInvitation(params?: any) {
    return await window.electronAPI.invoke('connection:createWebRTCInvitation', params)
  },

  async acceptPairingInvitation(invitation: any) {
    return await window.electronAPI.invoke('connection:acceptPairingInvitation', invitation)
  },

  async disconnect(instanceId: string) {
    return await window.electronAPI.invoke('connection:disconnect', instanceId)
  }
} as ConnectionPlan

/**
 * IPC Wrapper for TrustPlan (optional)
 */
const trustPlan: TrustPlan = {
  async getTrustLevel(personId: string) {
    return await window.electronAPI.invoke('trust:getTrustLevel', personId)
  },

  async setTrustLevel(params: any) {
    return await window.electronAPI.invoke('trust:setTrustLevel', params)
  }
} as TrustPlan

/**
 * IPC Wrapper for CubePlan
 */
const cubePlan: CubePlan = {
  async query(params: any) {
    return await window.electronAPI.invoke('cube:query', params)
  },

  async store(params: any) {
    return await window.electronAPI.invoke('cube:store', params)
  }
} as CubePlan

/**
 * IPC Wrapper for TransportPlan
 */
const transportPlan: TransportPlan = {
  async createWebRTCInvite(options) {
    const result = await window.electronAPI.transport.createWebRTCInvite(options || {})
    if (!result.success) {
      throw new Error(result.error || 'Failed to create WebRTC invite')
    }
    return {
      url: result.url,
      sessionId: result.sessionId,
      completeWithAnswer: async (answerUrl: string) => {
        const completeResult = await window.electronAPI.transport.completeWebRTCInvite({
          sessionId: result.sessionId,
          answerUrl
        })
        if (!completeResult.success) {
          throw new Error(completeResult.error || 'Failed to complete WebRTC invite')
        }
        return {} as any // Connection object placeholder
      },
      cancel: () => {
        window.electronAPI.transport.cancelWebRTCInvite({ sessionId: result.sessionId })
      }
    }
  },

  async acceptWebRTCInvite(offerUrl: string) {
    const result = await window.electronAPI.transport.acceptWebRTCInvite({ offerUrl })
    if (!result.success) {
      throw new Error(result.error || 'Failed to accept WebRTC invite')
    }
    return {
      answerUrl: result.answerUrl,
      connection: {} as any // Connection object placeholder
    }
  },

  getConnection(_sessionId: string) {
    return undefined // Not implemented for IPC
  },

  async shutdown() {
    // No-op for IPC - main process handles cleanup
  }
}

/**
 * IPC Wrapper for MemoryPlan
 */
const memoryPlan: MemoryPlan = {
  async getStatus(params) {
    return await window.electronAPI.invoke('memory:getStatus', params)
  },

  async toggle(params) {
    return await window.electronAPI.invoke('memory:toggle', params)
  },

  async enable(params) {
    return await window.electronAPI.invoke('memory:enable', params)
  },

  async disable(params) {
    return await window.electronAPI.invoke('memory:disable', params)
  },

  async extract(params) {
    return await window.electronAPI.invoke('memory:extract', params)
  },

  async find(params) {
    return await window.electronAPI.invoke('memory:find', params)
  },

  async listJournal(params) {
    return await window.electronAPI.invoke('memory:journal:list', params)
  },

  async getJournalEntry(params) {
    return await window.electronAPI.invoke('memory:journal:get', params)
  },

  async getKnowledgeGraph() {
    return await window.electronAPI.invoke('memory:getKnowledgeGraph')
  }
}

/**
 * IPC Wrapper for LocalModelsPlan
 * Provides cross-platform local inference (Whisper, embeddings)
 */
const localModelsPlan: LocalModelsPlan = {
  async whisperIsReady() {
    return await window.electronAPI.invoke('localModels:whisperIsReady')
  },

  async whisperTranscribe(params) {
    return await window.electronAPI.invoke('localModels:whisperTranscribe', params)
  },

  async getStatus(modelId: string) {
    const response = await window.electronAPI.invoke('localModels:getStatus', { modelId })
    if (response.success && response.data) {
      return {
        status: response.data.status === 'installed' ? 'ready' : response.data.status,
        progress: response.data.downloadProgress,
        error: response.data.error
      }
    }
    return { status: 'error', error: response.error }
  },

  async loadModel(modelId: string) {
    return await window.electronAPI.invoke('localModels:download', { modelId })
  },

  async unloadModel(modelId: string) {
    return await window.electronAPI.invoke('localModels:delete', { modelId })
  }
}

/**
 * Complete LAMAPlans implementation for Electron
 * All Plans are IPC wrappers that match Plan interfaces
 */
export const electronPlans: LAMAPlans = {
  // Chat Plans (from @chat/core)
  contacts: contactsPlan,
  chat: chatPlan,
  export: exportPlan,
  feedForward: feedForwardPlan,

  // AI Plans (from @lama/core)
  ai: aiPlan,
  aiAssistant: aiAssistantPlan,
  llmConfig: llmConfigPlan,
  topicAnalysis: topicAnalysisPlan,
  proposals: proposalsPlan,
  keywordDetail: keywordDetailPlan,
  wordCloudSettings: wordCloudSettingsPlan,
  crypto: cryptoPlan,
  audit: auditPlan,
  journal: journalPlan,

  // Connection Plans (from @lama/connection.core)
  connection: connectionPlan,

  // Trust Plans (from @trust/core)
  trust: trustPlan,

  // Cube Plans (dimensional storage)
  cube: cubePlan,

  // Memory Plans (from memory.core)
  memory: memoryPlan,

  // Transport Plans (from transport.core)
  transport: transportPlan,

  // Local Models Plans (from local.core)
  localModels: localModelsPlan

  // Platform-specific plans (optional):
  // filesystem?: FilesystemPlan  // TODO: Add Electron file dialog wrappers
}

/**
 * ElectronPlansProvider - Provides IPC-based Plans to all child components
 *
 * Wraps the app with PlansProvider, passing Electron-specific Plan implementations.
 * This allows lama.cube to use the SAME UI components as lama.browser.
 *
 * Usage:
 * ```typescript
 * // electron-ui/src/App.tsx
 * import { ElectronPlansProvider } from './providers/ElectronPlansProvider'
 * import { ChatLayout } from '@lama/browser/browser-ui/src/components/ChatLayout'
 *
 * function App() {
 *   return (
 *     <ElectronPlansProvider>
 *       <ChatLayout />
 *     </ElectronPlansProvider>
 *   )
 * }
 * ```
 */
export function ElectronPlansProvider({ children }: { children: ReactNode }) {
  const [ownerId, setOwnerId] = useState<string | null>(null)

  // Fetch owner ID on mount
  useEffect(() => {
    async function fetchOwnerId() {
      try {
        // Get owner ID from IPC
        const response = await window.electronAPI.invoke('onecore:getOwnerId')
        if (response.success && response.ownerId) {
          setOwnerId(response.ownerId)
        }
      } catch (error) {
        console.error('[ElectronPlansProvider] Failed to fetch owner ID:', error)
      }
    }
    fetchOwnerId()
  }, [])

  // Extend electronPlans with platform context
  const plansWithContext: LAMAPlansContext = {
    ...electronPlans,
    ownerId,
    // TODO: Implement isTopicLoading via IPC if needed
    isTopicLoading: () => false
  }

  return (
    <PlansProvider plans={plansWithContext}>
      {children}
    </PlansProvider>
  )
}
