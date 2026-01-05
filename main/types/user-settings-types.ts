/**
 * UserSettings Type Definitions Contract
 *
 * Re-exports types from @settings/core for backward compatibility.
 * See @settings/core for the canonical type definitions.
 */

// Re-export types from settings.core
export type {
  UserSettings,
  AISettings,
  UISettings,
  WordCloudSettings,
  ProposalSettings,
} from '@settings/core';

// Re-export defaults and validation
export {
  DEFAULT_AI_SETTINGS,
  DEFAULT_UI_SETTINGS,
  DEFAULT_WORD_CLOUD_SETTINGS,
  DEFAULT_PROPOSAL_SETTINGS,
  validateAISettings,
  validateUISettings,
  validateProposalSettings,
  isUserSettings,
} from '@settings/core';

// Cube-specific default (subset of full UserSettings)
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_UI_SETTINGS,
  DEFAULT_WORD_CLOUD_SETTINGS,
  DEFAULT_PROPOSAL_SETTINGS,
} from '@settings/core';

/**
 * Default user settings values (cube subset)
 */
export const DEFAULT_USER_SETTINGS = {
  ai: DEFAULT_AI_SETTINGS,
  ui: DEFAULT_UI_SETTINGS,
  proposals: DEFAULT_PROPOSAL_SETTINGS,
};
