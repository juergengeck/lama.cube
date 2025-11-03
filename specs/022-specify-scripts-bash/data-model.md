# Data Model: Configuration Consolidation

**Feature**: Configuration Consolidation
**Branch**: `022-config-consolidation`
**Date**: 2025-11-03

## Overview

This document defines the data structures for the consolidated configuration system. The model consolidates 9+ configuration mechanisms into 3 clean layers with clear separation of concerns.

---

## Layer 1: Bootstrap Config (File-Based)

### LamaConfig

**Storage**: `lama.config.json` or `~/.lama/config.json`
**Format**: JSON file
**Loaded**: Once at application startup
**Precedence**: CLI args > Environment variables > Config file > Defaults

```typescript
interface LamaConfig {
  instance: {
    name: string;           // Instance display name
    email: string;          // User email (ID for UserSettings)
    secret: string;         // Authentication secret/password
    directory: string;      // OneDB storage path (default: ./OneDB)
    wipeStorage?: boolean;  // Wipe on startup flag (dev/testing only)
  };

  network: {
    commServer: {
      url: string;          // WebSocket commserver URL
      enabled: boolean;     // Enable commserver connection
    };
    direct: {
      enabled: boolean;     // Enable direct P2P connections
      endpoint: string;     // Direct connection endpoint (e.g., ws://localhost:8765)
    };
    priority: 'direct' | 'commserver' | 'both';  // Connection priority
  };

  web: {
    url?: string;          // Web UI access URL (Vite dev or production)
  };

  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';  // Log verbosity
  };
}
```

**Example**:
```json
{
  "instance": {
    "name": "LAMA Desktop",
    "email": "user@example.com",
    "secret": "password123",
    "directory": "./OneDB"
  },
  "network": {
    "commServer": {
      "url": "wss://comm.refinio.one",
      "enabled": true
    },
    "direct": {
      "enabled": true,
      "endpoint": "ws://localhost:8765"
    },
    "priority": "both"
  },
  "logging": {
    "level": "info"
  }
}
```

**Loading Logic**:
```typescript
// Precedence chain
const config = {
  ...defaultConfig,
  ...loadFromFile('lama.config.json'),
  ...loadFromEnvironment(process.env),
  ...parseCliArgs(process.argv)
};
```

---

## Layer 2: User Settings (ONE.core Versioned)

### UserSettings

**Storage**: ONE.core versioned object
**Type**: `$type$: 'UserSettings'`
**ID Field**: `userEmail` (string)
**Sync**: Via CHUM protocol across instances
**Versioning**: Automatic via ONE.core

```typescript
interface UserSettings {
  $type$: 'UserSettings';
  userEmail: string;  // ID field - user's email from LamaConfig

  ai: {
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
  };

  ui: {
    theme: 'dark' | 'light';         // UI theme
    notifications: boolean;          // Enable notifications

    wordCloud: {
      maxWordsPerSubject: number;    // Max keywords per subject (default: 100)
      relatedWordThreshold: number;  // Similarity threshold (0.0-1.0)
      minWordFrequency: number;      // Minimum frequency to display
      showSummaryKeywords: boolean;  // Show keywords from summary
      fontScaleMin: number;          // Min font size (px)
      fontScaleMax: number;          // Max font size (px)
      colorScheme: string;           // Color scheme name (e.g., "viridis")
      layoutDensity: string;         // Layout density (e.g., "normal")
    };
  };

  proposals: {
    matchWeight: number;      // Keyword match weight (0.0-1.0)
    recencyWeight: number;    // Recency weight (0.0-1.0)
    recencyWindow: number;    // Recency window (milliseconds)
    minJaccard: number;       // Min Jaccard similarity (0.0-1.0)
    maxProposals: number;     // Max proposals to show (1-50)
  };

  updatedAt: number;  // Unix timestamp of last update
}
```

**Default Values**:
```typescript
export const DEFAULT_USER_SETTINGS = {
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
    recencyWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
    minJaccard: 0.1,
    maxProposals: 10
  }
};
```

**ONE.core Recipe**:
```typescript
export const UserSettingsRecipe: Recipe = {
  $type$: 'Recipe',
  name: 'UserSettings',
  rule: [
    {
      itemprop: 'userEmail',
      isId: true,  // ID field for versioning
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'ai',
      itemtype: {
        type: 'object',
        rules: [
          { itemprop: 'defaultModelId', itemtype: { type: 'string' }, optional: true },
          { itemprop: 'temperature', itemtype: { type: 'number' } },
          { itemprop: 'maxTokens', itemtype: { type: 'number' } },
          { itemprop: 'defaultProvider', itemtype: { type: 'string' } },
          { itemprop: 'autoSelectBestModel', itemtype: { type: 'boolean' } },
          {
            itemprop: 'preferredModelIds',
            itemtype: {
              type: 'array',
              item: { type: 'string' }
            }
          },
          { itemprop: 'systemPrompt', itemtype: { type: 'string' }, optional: true },
          { itemprop: 'streamResponses', itemtype: { type: 'boolean' } },
          { itemprop: 'autoSummarize', itemtype: { type: 'boolean' } },
          { itemprop: 'enableMCP', itemtype: { type: 'boolean' } }
        ]
      }
    },
    {
      itemprop: 'ui',
      itemtype: {
        type: 'object',
        rules: [
          { itemprop: 'theme', itemtype: { type: 'string', regexp: /^(dark|light)$/ } },
          { itemprop: 'notifications', itemtype: { type: 'boolean' } },
          {
            itemprop: 'wordCloud',
            itemtype: {
              type: 'object',
              rules: [
                { itemprop: 'maxWordsPerSubject', itemtype: { type: 'number' } },
                { itemprop: 'relatedWordThreshold', itemtype: { type: 'number' } },
                { itemprop: 'minWordFrequency', itemtype: { type: 'number' } },
                { itemprop: 'showSummaryKeywords', itemtype: { type: 'boolean' } },
                { itemprop: 'fontScaleMin', itemtype: { type: 'number' } },
                { itemprop: 'fontScaleMax', itemtype: { type: 'number' } },
                { itemprop: 'colorScheme', itemtype: { type: 'string' } },
                { itemprop: 'layoutDensity', itemtype: { type: 'string' } }
              ]
            }
          }
        ]
      }
    },
    {
      itemprop: 'proposals',
      itemtype: {
        type: 'object',
        rules: [
          { itemprop: 'matchWeight', itemtype: { type: 'number' } },
          { itemprop: 'recencyWeight', itemtype: { type: 'number' } },
          { itemprop: 'recencyWindow', itemtype: { type: 'number' } },
          { itemprop: 'minJaccard', itemtype: { type: 'number' } },
          { itemprop: 'maxProposals', itemtype: { type: 'number' } }
        ]
      }
    },
    {
      itemprop: 'updatedAt',
      itemtype: { type: 'number' }
    }
  ]
};
```

---

## Layer 3: Entity Configs (ONE.core Versioned)

These remain unchanged from current implementation:

### MCPServerConfig

**ID Field**: `userEmail`
**Purpose**: User's configured MCP servers

```typescript
interface MCPServerConfig {
  $type$: 'MCPServerConfig';
  userEmail: string;                  // ID field
  servers: SHA256IdHash<MCPServer>[]; // References to MCPServer objects
  updatedAt: number;
}
```

### MCPTopicConfig

**ID Field**: `topicId`
**Purpose**: Per-conversation MCP settings

```typescript
interface MCPTopicConfig {
  $type$: 'MCPTopicConfig';
  topicId: string;          // ID field
  inboundEnabled: boolean;  // AI can use MCP tools
  outboundEnabled: boolean; // External access to chat tools
  allowedTools?: string[];  // Specific tools allowed
  createdAt: number;
  updatedAt: number;
}
```

### LLM

**ID Field**: `name`
**Purpose**: Per-model configuration with encrypted tokens

```typescript
interface LLM {
  $type$: 'LLM';
  name: string;                      // ID field
  modelId: string;
  filename: string;
  modelType: 'local' | 'remote';
  active: boolean;
  deleted: boolean;
  created: number;
  modified: number;
  createdAt: string;
  lastUsed: string;
  personId?: SHA256IdHash<Person>;   // AI contact linkage
  // Encrypted authentication
  encryptedAuthToken?: string;       // Via Electron safeStorage
  // Model parameters
  temperature?: number;
  maxTokens?: number;
  contextSize?: number;
  // ... additional fields
}
```

---

## Data Relationships

```
LamaConfig (file)
    ├─ instance.email ──────┐
    └─ network.*            │
                            │
UserSettings (ONE.core)     │
    ├─ userEmail ←──────────┘ (FK: LamaConfig.instance.email)
    ├─ ai.defaultModelId ───┐
    └─ ui.*, proposals.*    │
                            │
LLM (ONE.core)              │
    └─ name ←───────────────┘ (referenced by defaultModelId)

MCPServerConfig (ONE.core)
    └─ userEmail ←────────── (FK: LamaConfig.instance.email)

MCPTopicConfig (ONE.core)
    └─ topicId ←────────────(FK: Topic.id)
```

---

## State Transitions

### UserSettings Lifecycle

```
┌─────────────────┐
│  Not Exists     │ (Fresh install)
└────────┬────────┘
         │ First access → createDefaultSettings()
         ▼
┌─────────────────┐
│  Default Values │
└────────┬────────┘
         │ User modifies → updateAI() / updateUI() / updateProposals()
         ▼
┌─────────────────┐
│  Customized     │ ◄─────┐
└────────┬────────┘       │
         │                │
         │ CHUM sync      │ More updates
         ▼                │
┌─────────────────┐       │
│  Synced Across  │───────┘
│  Instances      │
└─────────────────┘
```

### Migration State Machine

```
┌─────────────────────────┐
│ Old Config Exists       │ (Pre-refactor)
│ - GlobalLLMSettings     │
│ - WordCloudSettings     │
└────────┬────────────────┘
         │ App upgrade + startup
         ▼
┌─────────────────────────┐
│ Migration Script Runs   │
│ - Query old objects     │
│ - Map to UserSettings   │
│ - storeVersionedObject  │
└────────┬────────────────┘
         │
         ├─ Success ────────────► Old config preserved (not deleted)
         │                        New UserSettings created
         │                        App continues
         │
         └─ Failure ────────────► Log error
                                  Use default UserSettings
                                  App continues
```

---

## Validation Rules

### LamaConfig Validation
- `instance.email`: Must be valid email format
- `instance.directory`: Must be writable path
- `network.commServer.url`: Must be valid wss:// URL
- `network.direct.endpoint`: Must be valid ws:// URL
- `logging.level`: Must be one of: debug, info, warn, error

### UserSettings Validation
- `ai.temperature`: 0.0 ≤ temperature ≤ 2.0
- `ai.maxTokens`: 1 ≤ maxTokens ≤ 100000
- `ui.wordCloud.maxWordsPerSubject`: 1 ≤ max ≤ 1000
- `ui.wordCloud.fontScaleMin`: 1 ≤ min < max
- `ui.wordCloud.fontScaleMax`: min < max ≤ 200
- `proposals.matchWeight`: 0.0 ≤ weight ≤ 1.0
- `proposals.recencyWeight`: 0.0 ≤ weight ≤ 1.0
- `proposals.minJaccard`: 0.0 ≤ threshold ≤ 1.0
- `proposals.maxProposals`: 1 ≤ max ≤ 50

---

## Indexing & Queries

### UserSettings Queries
```typescript
// Get by ID (primary key)
const idHash = await calculateIdHashOfObj({
  $type$: 'UserSettings',
  userEmail: 'user@example.com'
});
const result = await getObjectByIdHash(idHash);
const settings = result.obj;
```

### No Secondary Indexes Needed
UserSettings has single ID field (userEmail) - no complex queries required. Access pattern is always by user email (known from LamaConfig).

---

## Data Model Summary

| Layer | Storage | Type | ID Field | Sync | Count |
|-------|---------|------|----------|------|-------|
| Bootstrap | File | LamaConfig | N/A | No | 1 per instance |
| User Settings | ONE.core | UserSettings | userEmail | CHUM | 1 per user |
| Entity Configs | ONE.core | Multiple types | Varies | CHUM | Many per user |

**Total Reduction**: From 9+ configuration types/locations down to 3 clear layers.
