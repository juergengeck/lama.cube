/**
 * UserSettings Type Definitions Contract
 *
 * These types define the structure of user settings across the LAMA application.
 * They must remain consistent between main process (Node.js) and renderer process (Browser).
 */

/**
 * Unified user settings synced via CHUM across instances
 * Stored as ONE.core versioned object with userEmail as ID field
 */
export interface UserSettings {
  $type$: 'UserSettings';
  userEmail: string;  // ID field for ONE.core versioning
  ai: AISettings;
  ui: UISettings;
  proposals: ProposalSettings;
  updatedAt: number;  // Unix timestamp
}

/**
 * AI/LLM configuration settings
 * Replaces GlobalLLMSettings
 */
export interface AISettings {
  defaultModelId?: string;        // Selected AI model (e.g., "qwen2.5:7b")
  temperature: number;             // LLM temperature (0.0-2.0)
  maxTokens: number;               // Maximum tokens per response
  defaultProvider: string;         // Provider name (e.g., "ollama", "claude")
  autoSelectBestModel: boolean;    // Auto-select optimal model
  preferredModelIds: string[];     // Preferred models list
  systemPrompt?: string;           // Custom system prompt
  streamResponses: boolean;        // Enable response streaming
  autoSummarize: boolean;          // Auto-generate summaries
  enableMCP: boolean;              // Enable MCP tool integration
}

/**
 * UI preferences
 */
export interface UISettings {
  theme: 'dark' | 'light';         // UI theme
  notifications: boolean;          // Enable notifications
  wordCloud: WordCloudSettings;    // Word cloud visualization
}

/**
 * Word cloud visualization preferences
 * Replaces WordCloudSettings
 */
export interface WordCloudSettings {
  maxWordsPerSubject: number;    // Max keywords per subject (1-1000)
  relatedWordThreshold: number;  // Similarity threshold (0.0-1.0)
  minWordFrequency: number;      // Minimum frequency to display
  showSummaryKeywords: boolean;  // Show keywords from summary
  fontScaleMin: number;          // Min font size (px)
  fontScaleMax: number;          // Max font size (px)
  colorScheme: string;           // Color scheme name
  layoutDensity: string;         // Layout density
}

/**
 * Context-aware proposal settings
 * Replaces ProposalConfig
 */
export interface ProposalSettings {
  matchWeight: number;      // Keyword match weight (0.0-1.0)
  recencyWeight: number;    // Recency weight (0.0-1.0)
  recencyWindow: number;    // Recency window (milliseconds)
  minJaccard: number;       // Min Jaccard similarity (0.0-1.0)
  maxProposals: number;     // Max proposals to show (1-50)
}

/**
 * Default user settings values
 */
export const DEFAULT_USER_SETTINGS: Omit<UserSettings, '$type$' | 'userEmail' | 'updatedAt'> = {
  ai: {
    temperature: 0.7,
    maxTokens: 2048,
    defaultProvider: 'ollama',
    autoSelectBestModel: false,
    preferredModelIds: [],
    streamResponses: true,
    autoSummarize: false,
    enableMCP: false
  },
  ui: {
    theme: 'dark',
    notifications: true,
    wordCloud: {
      maxWordsPerSubject: 100,
      relatedWordThreshold: 0.5,
      minWordFrequency: 2,
      showSummaryKeywords: true,
      fontScaleMin: 12,
      fontScaleMax: 64,
      colorScheme: 'viridis',
      layoutDensity: 'normal'
    }
  },
  proposals: {
    matchWeight: 0.7,
    recencyWeight: 0.3,
    recencyWindow: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    minJaccard: 0.1,
    maxProposals: 10
  }
};

/**
 * Type guard for UserSettings
 */
export function isUserSettings(obj: unknown): obj is UserSettings {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    '$type$' in obj &&
    obj.$type$ === 'UserSettings' &&
    'userEmail' in obj &&
    'ai' in obj &&
    'ui' in obj &&
    'proposals' in obj
  );
}

/**
 * Validation helper for AI settings
 */
export function validateAISettings(settings: Partial<AISettings>): string[] {
  const errors: string[] = [];

  if (settings.temperature !== undefined) {
    if (settings.temperature < 0 || settings.temperature > 2) {
      errors.push('temperature must be between 0 and 2');
    }
  }

  if (settings.maxTokens !== undefined) {
    if (settings.maxTokens < 1 || settings.maxTokens > 100000) {
      errors.push('maxTokens must be between 1 and 100000');
    }
  }

  return errors;
}

/**
 * Validation helper for UI settings
 */
export function validateUISettings(settings: Partial<UISettings>): string[] {
  const errors: string[] = [];

  if (settings.theme !== undefined) {
    if (settings.theme !== 'dark' && settings.theme !== 'light') {
      errors.push('theme must be "dark" or "light"');
    }
  }

  if (settings.wordCloud) {
    const wc = settings.wordCloud;
    if (wc.maxWordsPerSubject !== undefined) {
      if (wc.maxWordsPerSubject < 1 || wc.maxWordsPerSubject > 1000) {
        errors.push('maxWordsPerSubject must be between 1 and 1000');
      }
    }
    if (wc.relatedWordThreshold !== undefined) {
      if (wc.relatedWordThreshold < 0 || wc.relatedWordThreshold > 1) {
        errors.push('relatedWordThreshold must be between 0 and 1');
      }
    }
    if (wc.fontScaleMin !== undefined && wc.fontScaleMax !== undefined) {
      if (wc.fontScaleMin >= wc.fontScaleMax) {
        errors.push('fontScaleMin must be less than fontScaleMax');
      }
    }
  }

  return errors;
}

/**
 * Validation helper for proposal settings
 */
export function validateProposalSettings(settings: Partial<ProposalSettings>): string[] {
  const errors: string[] = [];

  if (settings.matchWeight !== undefined) {
    if (settings.matchWeight < 0 || settings.matchWeight > 1) {
      errors.push('matchWeight must be between 0 and 1');
    }
  }

  if (settings.recencyWeight !== undefined) {
    if (settings.recencyWeight < 0 || settings.recencyWeight > 1) {
      errors.push('recencyWeight must be between 0 and 1');
    }
  }

  if (settings.minJaccard !== undefined) {
    if (settings.minJaccard < 0 || settings.minJaccard > 1) {
      errors.push('minJaccard must be between 0 and 1');
    }
  }

  if (settings.maxProposals !== undefined) {
    if (settings.maxProposals < 1 || settings.maxProposals > 50) {
      errors.push('maxProposals must be between 1 and 50');
    }
  }

  return errors;
}
