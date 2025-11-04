/**
 * Migration API Contract
 *
 * Defines the interface for data migration from old configuration types
 * (GlobalLLMSettings, WordCloudSettings) to the new unified UserSettings.
 */

import type { UserSettings } from './user-settings-types.js';

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migratedFrom: string[];  // List of old config types migrated
  errors: string[];         // Any errors encountered
  userSettings: UserSettings | null;  // Resulting UserSettings (null if failed)
}

/**
 * Migration function signature for GlobalLLMSettings
 *
 * @param nodeOneCore - NodeOneCore instance
 * @returns Migration result
 */
export type MigrateGlobalLLMSettings = (
  nodeOneCore: any
) => Promise<MigrationResult>;

/**
 * Migration function signature for WordCloudSettings
 *
 * @param nodeOneCore - NodeOneCore instance
 * @returns Migration result
 */
export type MigrateWordCloudSettings = (
  nodeOneCore: any
) => Promise<MigrationResult>;

/**
 * Old GlobalLLMSettings structure (for reference)
 * @deprecated Migrating to UserSettings.ai
 */
export interface GlobalLLMSettings {
  $type$: 'GlobalLLMSettings';
  name: string;  // Instance name (ID field)
  defaultModelId?: string;
  temperature?: number;
  maxTokens?: number;
  defaultProvider: string;
  autoSelectBestModel: boolean;
  preferredModelIds: string[];
  systemPrompt?: string;
  streamResponses?: boolean;
  autoSummarize?: boolean;
  enableMCP?: boolean;
}

/**
 * Old WordCloudSettings structure (for reference)
 * @deprecated Migrating to UserSettings.ui.wordCloud
 */
export interface WordCloudSettings {
  $type$: 'WordCloudSettings';
  creator: string;  // User ID
  created: number;
  modified: number;
  maxWordsPerSubject: number;
  relatedWordThreshold: number;
  minWordFrequency: number;
  showSummaryKeywords: boolean;
  fontScaleMin: number;
  fontScaleMax: number;
  colorScheme: string;
  layoutDensity: string;
}

/**
 * Migration orchestrator
 *
 * Runs all migrations in sequence and consolidates results.
 * Called during NodeOneCore initialization after models are ready.
 */
export interface MigrationOrchestrator {
  /**
   * Run all configuration migrations
   *
   * @param nodeOneCore - NodeOneCore instance
   * @returns Consolidated migration result
   */
  runMigrations(nodeOneCore: any): Promise<MigrationResult>;
}

/**
 * Expected migration behavior
 */
export const MIGRATION_BEHAVIOR = {
  /**
   * Idempotency: Migrations can be safely re-run
   * - If UserSettings already exists with migrated data, skip migration
   * - If old settings don't exist, skip migration (use defaults)
   * - If migration fails, log error but continue with defaults
   */
  idempotent: true,

  /**
   * Data preservation: Old settings are NOT deleted
   * - GlobalLLMSettings objects remain in storage
   * - WordCloudSettings objects remain in storage
   * - Allows rollback by reverting to old code version
   */
  preserveOldData: true,

  /**
   * Error handling: Migrations MUST NOT crash the app
   * - Catch all errors and log them
   * - Fall back to default UserSettings if migration fails
   * - Return MigrationResult with success=false and error details
   */
  failGracefully: true,

  /**
   * Performance: Migrations MUST complete quickly
   * - Target: <2 seconds for all migrations combined
   * - Timeout: 5 seconds maximum before falling back to defaults
   * - Non-blocking: Don't prevent app startup if migrations are slow
   */
  performanceTarget: {
    targetMs: 2000,
    timeoutMs: 5000
  }
};

/**
 * Migration checklist for implementation
 */
export const MIGRATION_CHECKLIST = [
  'Query old settings by ID hash using calculateIdHashOfObj()',
  'Check if UserSettings already exists (skip if found)',
  'Map old settings fields to new UserSettings structure',
  'Validate all values are within acceptable ranges',
  'Call userSettingsManager.updateAI() or updateUI()',
  'Log migration success with details',
  'On error: log, return MigrationResult with errors, fall back to defaults',
  'Never delete old settings objects (preserve for rollback)',
  'Never crash the app - always continue with defaults on error'
];

/**
 * Test scenarios for migrations
 */
export const MIGRATION_TEST_SCENARIOS = [
  {
    name: 'Fresh install',
    oldSettingsExist: false,
    expectedBehavior: 'Create default UserSettings, no migration needed'
  },
  {
    name: 'Old GlobalLLMSettings exists',
    oldSettingsExist: true,
    expectedBehavior: 'Migrate to UserSettings.ai, preserve old object'
  },
  {
    name: 'Old WordCloudSettings exists',
    oldSettingsExist: true,
    expectedBehavior: 'Migrate to UserSettings.ui.wordCloud, preserve old object'
  },
  {
    name: 'Both old settings exist',
    oldSettingsExist: true,
    expectedBehavior: 'Migrate both, consolidate into single UserSettings'
  },
  {
    name: 'Already migrated (UserSettings exists)',
    oldSettingsExist: true,
    expectedBehavior: 'Skip migration, use existing UserSettings'
  },
  {
    name: 'Corrupted old settings',
    oldSettingsExist: true,
    expectedBehavior: 'Log error, fall back to defaults, continue'
  },
  {
    name: 'Migration timeout',
    oldSettingsExist: true,
    expectedBehavior: 'After 5 seconds, abort and use defaults'
  }
];
