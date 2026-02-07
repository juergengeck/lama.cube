/**
 * Reset All IPC Plan Singletons
 *
 * This module exports a function that resets all IPC plan singletons
 * when app data is cleared. This ensures that stale references to old
 * models don't persist across data clear operations.
 *
 * IMPORTANT: When adding new singleton instances to IPC plan files,
 * also add a reset function and import it here.
 */

// Import reset functions from all IPC plan files that have singletons
import { resetChatPlanSingletons } from './chat.js';
import { resetContactsPlanSingleton } from './contacts.js';
import { resetProposalsPlanSingletons } from './proposals.js';
import { resetTrustPlanSingletons } from './trust.js';
import { resetGluePlanSingleton } from './glue.js';
import { resetGroupChatPlanSingleton } from './group-chat.js';
import { resetOneCorePlanSingletons } from './one-core.js';
import { resetQuicVCDiscoverySingletons } from './quicvc-discovery.js';
import { resetAuditPlanSingletons } from './audit.js';
import { resetMCPPlans } from './mcp.js';
import { resetLLMConfigSingletons } from './llm-config.js';
import { resetKeywordDetailSingleton } from './keyword-detail.js';
import { resetExportPlanSingleton } from './export.js';
import { resetMoltPlanSingletons } from './molt.js';

/**
 * Reset all IPC plan singletons
 *
 * Called from clear-app-data.ts when user clears app data.
 * This ensures all lazy-initialized plan instances are recreated
 * with fresh model references on re-login.
 */
export function resetAllIPCPlanSingletons(): void {
  console.log('[ResetSingletons] Resetting all IPC plan singletons...');

  // Reset all plan singletons
  resetChatPlanSingletons();
  resetContactsPlanSingleton();
  resetProposalsPlanSingletons();
  resetTrustPlanSingletons();
  resetGluePlanSingleton();
  resetGroupChatPlanSingleton();
  resetOneCorePlanSingletons();
  resetQuicVCDiscoverySingletons();
  resetAuditPlanSingletons();
  resetMCPPlans();
  resetLLMConfigSingletons();
  resetKeywordDetailSingleton();
  resetExportPlanSingleton();
  resetMoltPlanSingletons();

  console.log('[ResetSingletons] All IPC plan singletons reset');
}
