# LLM Capability Consolidation Plan

## Overview

This plan consolidates LLM capability handling to eliminate scattered sources, redundant code paths, and inconsistent capability formats. The goal is a single source of truth for model capabilities throughout the chat flow.

**Last Updated**: 2026-01-31
**Status**: Complete ✅
**Target Files**: `lama.core/services/`

---

## Current State Analysis

### Issue Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Duplicate capability fetching | Medium | **FIXED** - `ollama-validator.ts` no longer has `fetchOllamaModelCapabilities()` |
| 2 | Tool injection without capability check | High | **FIXED** - `system-prompt-builder.ts:215-227` now checks capabilities |
| 3 | Multiple capability sources | Medium | **OPEN** - 4 different sources still exist |
| 4 | Legacy routing in LLMManager | Low | **OPEN** - Lines 780-798 still have fallback routing |
| 5 | Capability check timing | Medium | **OPEN** - Check happens in SystemPromptBuilder, but not in AIPromptBuilder |
| 6 | Context cache duplication | Low | **FIXED** - OllamaAdapter now uses passed cache |

### Current Capability Sources

1. **Ollama `/api/show` response** (`ollama.ts:576-617`)
   - Returns: `['completion', 'tools', 'vision', 'thinking']` array
   - Used during: Model discovery

2. **LLM Object `capabilities` field**
   - Format: `string[]` like `['completion', 'tools']` or `LLMCapabilities` object
   - Stored in: LLM Registry and ONE.core storage

3. **`capability-resolver.ts` KNOWN_CAPABILITIES** (lines 12-98)
   - Format: `LLMCapabilities` object
   - Profiles for: Claude, GPT, o1, Granite, Llama, Qwen

4. **AdapterCapabilities on adapters** (`llm-adapters/types.ts:57-64`)
   - Format: Different from LLMCapabilities
   - Fields: `chat`, `streaming`, `structuredOutput`, `thinking`, `toolCalls`, `embeddings`

### Two Capability Formats (Problem)

**Format A: String Array** (from Ollama, stored on LLM)
```typescript
['completion', 'tools', 'vision', 'thinking']
```

**Format B: LLMCapabilities Object** (from resolver, used in prompts)
```typescript
{
  contextWindow: 200000,
  supportsVision: true,
  supportsThinking: true,
  supportsTools: true,
  supportsStreaming: true,
  responseStyle: 'detailed'
}
```

These two formats require translation, which happens inconsistently.

---

## Implementation Plan

### Phase 1: Unify Capability Format

**Goal**: Single `LLMCapabilities` interface throughout the codebase.

#### Task 1.1: Extend LLMCapabilities Interface

**File**: `lama.core/models/ai/types.ts`

Add missing fields to match all capability sources:

```typescript
export interface LLMCapabilities {
  // Existing
  contextWindow: number;
  supportsVision?: boolean;
  supportsThinking?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  responseStyle?: 'concise' | 'detailed' | 'balanced';

  // New: From Ollama capabilities array
  supportsCompletion?: boolean;  // Maps from 'completion'

  // New: From AdapterCapabilities
  supportsStructuredOutput?: boolean;
  supportsEmbeddings?: boolean;
}
```

#### Task 1.2: Update Ollama Capability Mapping

**File**: `lama.core/services/ollama.ts`

Add function to convert string array to LLMCapabilities:

```typescript
/**
 * Convert Ollama capabilities array to LLMCapabilities object
 */
export function mapOllamaCapabilities(
  capabilitiesArray: string[],
  contextLength?: number
): LLMCapabilities {
  return {
    contextWindow: contextLength || 4096,
    supportsCompletion: capabilitiesArray.includes('completion'),
    supportsTools: capabilitiesArray.includes('tools'),
    supportsVision: capabilitiesArray.includes('vision'),
    supportsThinking: capabilitiesArray.includes('thinking'),
    supportsStreaming: true, // Ollama always supports streaming
    supportsStructuredOutput: capabilitiesArray.includes('tools'), // Tools implies structured
    responseStyle: 'balanced'
  };
}
```

Update `getLocalOllamaModels()` to store mapped capabilities:

```typescript
// In getLocalOllamaModels()
const modelsWithCapabilities = await Promise.all(
  models.map(async (model) => {
    const rawCapabilities = await fetchModelCapabilities(model.name, baseUrl, authToken);
    return {
      ...model,
      capabilities: mapOllamaCapabilities(rawCapabilities, model.contextLength)
    };
  })
);
```

#### Task 1.3: Update Capability Resolver

**File**: `lama.core/services/capability-resolver.ts`

Handle both formats in input, always return `LLMCapabilities`:

```typescript
export function resolveCapabilities(
  modelId: string,
  storedCapabilities?: LLMCapabilities | string[], // Accept both formats
  provider?: string,
  contextLength?: number
): LLMCapabilities {
  let capabilities: LLMCapabilities = { ...DEFAULT_CAPABILITIES };

  // Handle legacy string array format
  if (Array.isArray(storedCapabilities)) {
    capabilities = {
      ...capabilities,
      supportsCompletion: storedCapabilities.includes('completion'),
      supportsTools: storedCapabilities.includes('tools'),
      supportsVision: storedCapabilities.includes('vision'),
      supportsThinking: storedCapabilities.includes('thinking')
    };
  } else if (storedCapabilities && typeof storedCapabilities === 'object') {
    // LLMCapabilities object - merge directly
    capabilities = { ...capabilities, ...storedCapabilities };
  }

  // Override with known profile if available
  const knownProfile = findMatchingProfile(modelId);
  if (knownProfile) {
    // Only override undefined fields, don't override stored capabilities
    for (const [key, value] of Object.entries(knownProfile)) {
      if ((capabilities as any)[key] === undefined) {
        (capabilities as any)[key] = value;
      }
    }
  }

  // Override context window if explicitly provided
  if (contextLength) {
    capabilities.contextWindow = contextLength;
  }

  return capabilities;
}
```

---

### Phase 2: Create Capability Service

**Goal**: Single point of access for model capabilities.

#### Task 2.1: Create LLMCapabilityService

**File**: `lama.core/services/llm-capability-service.ts` (NEW)

```typescript
/**
 * LLM Capability Service
 * Single source of truth for model capabilities
 *
 * Resolution priority:
 * 1. Cached capabilities (from previous resolution)
 * 2. LLM Registry (discovery-time capabilities)
 * 3. LLM Storage (persisted capabilities)
 * 4. Known profiles (capability-resolver.ts)
 * 5. Provider defaults
 * 6. Conservative defaults
 */

import { resolveCapabilities, getCapabilityHints } from './capability-resolver.js';
import type { LLMCapabilities } from '../models/ai/types.js';

export class LLMCapabilityService {
  private cache: Map<string, LLMCapabilities> = new Map();

  constructor(
    private llmRegistry: any,
    private getLLMFromStorage: (modelId: string) => Promise<any>
  ) {}

  /**
   * Get capabilities for a model
   * Caches result for consistent access within session
   */
  async getCapabilities(modelId: string): Promise<LLMCapabilities> {
    // Check cache first
    const cached = this.cache.get(modelId);
    if (cached) {
      return cached;
    }

    // Try registry (preferred - has fresh discovery data)
    let llm = this.llmRegistry.get(modelId);

    // Fall back to storage
    if (!llm) {
      llm = await this.getLLMFromStorage(modelId);
    }

    // Resolve with all available context
    const capabilities = resolveCapabilities(
      modelId,
      llm?.capabilities,
      llm?.provider,
      llm?.contextLength
    );

    // Cache for this session
    this.cache.set(modelId, capabilities);

    return capabilities;
  }

  /**
   * Check if model supports specific capability
   */
  async supportsTools(modelId: string): Promise<boolean> {
    const caps = await this.getCapabilities(modelId);
    return caps.supportsTools === true;
  }

  async supportsVision(modelId: string): Promise<boolean> {
    const caps = await this.getCapabilities(modelId);
    return caps.supportsVision === true;
  }

  async supportsThinking(modelId: string): Promise<boolean> {
    const caps = await this.getCapabilities(modelId);
    return caps.supportsThinking === true;
  }

  /**
   * Get capability hints for prompts
   */
  async getHints(modelId: string): Promise<string[]> {
    const caps = await this.getCapabilities(modelId);
    return getCapabilityHints(caps);
  }

  /**
   * Invalidate cache for model (e.g., after rediscovery)
   */
  invalidate(modelId: string): void {
    this.cache.delete(modelId);
  }

  /**
   * Clear all cached capabilities
   */
  clearCache(): void {
    this.cache.clear();
  }
}
```

#### Task 2.2: Integrate Service into LLMManager

**File**: `lama.core/services/llm-manager.ts`

```typescript
// In constructor
this.capabilityService = new LLMCapabilityService(
  this.llmRegistry,
  (modelId) => this.getLLMFromStorage(modelId)
);

// Expose for SystemPromptBuilder
getCapabilityService(): LLMCapabilityService {
  return this.capabilityService;
}

// In chat(), use capability service for tool check
const supportsTools = await this.capabilityService.supportsTools(effectiveModelId);
const shouldDisableTools = (options as any)?.disableTools === true || !supportsTools;
```

#### Task 2.3: Update SystemPromptBuilder

**File**: `lama.core/services/system-prompt-builder.ts`

Use capability service instead of direct LLM access:

```typescript
// Section 7: MCP Tools
generate: async (context?: SystemPromptContext) => {
  if (!this.mcpManager) return '';

  // Use capability service for consistent capability resolution
  if (context?.modelId && context?.capabilityService) {
    const supportsTools = await context.capabilityService.supportsTools(context.modelId);
    if (!supportsTools) {
      console.log(`[SystemPromptBuilder] Skipping tools - model ${context.modelId} does not support tools`);
      return '';
    }
  }

  return this.mcpManager.getCompactToolDescriptions?.() || '';
}
```

Update `SystemPromptContext` interface:

```typescript
export interface SystemPromptContext {
  // ... existing fields
  capabilityService?: LLMCapabilityService;
}
```

---

### Phase 3: Remove Legacy Code

**Goal**: Clean up deprecated code paths.

#### Task 3.1: Remove Legacy Routing from LLMManager

**File**: `lama.core/services/llm-manager.ts`

**Location**: Lines 780-798

**Before**:
```typescript
if (adapter) {
  // Adapter path
} else {
  // Fallback to legacy routing (will be removed once all adapters are registered)
  if (inferenceType === 'ondevice') { ... }
  else if (provider === 'ollama') { ... }
  // ...etc
}
```

**After**:
```typescript
if (adapter) {
  // Adapter path - now the only path
  const chatResult = await adapter.chat(llmObject, enhancedMessages, {
    ...options,
    promptParts,
    platform: this.platform,
    ollamaContextCache: this.ollamaContextCache
  });
  response = this.extractContent(chatResult);
} else {
  // No adapter available - fail fast
  throw new Error(
    `No adapter available for model ${effectiveModelId} ` +
    `(provider: ${llmObject.provider}, inferenceType: ${llmObject.inferenceType}). ` +
    `Ensure the provider adapter is registered.`
  );
}
```

**Prerequisite**: Verify all providers have adapters registered:
- `ollama` → OllamaAdapter ✓
- `anthropic` → AnthropicAdapter ✓
- `openai` → OpenAIAdapter ✓
- `local` / `local-onnx` → TransformersAdapter ✓
- `lmstudio` → Need to verify/create adapter

#### Task 3.2: Verify LMStudio Adapter Exists

**Check**: Does `lmstudio` have an adapter? If not:

Option A: Create LMStudioAdapter (preferred)
Option B: Have LMStudio models register with `provider: 'openai'` since LMStudio uses OpenAI API format

#### Task 3.3: Remove Deprecated chatWith* Methods

After legacy routing is removed, these methods become dead code:
- `chatWithOllama()` - Only used by legacy path, adapter calls `ollama.ts` directly
- `chatWithClaude()` - Only used by legacy path
- `chatWithOpenAI()` - Only used by legacy path
- `chatWithLMStudio()` - Only used by legacy path
- `chatWithLocal()` - Only used by legacy path

**Keep**: Only adapter-related methods and the main `chat()` orchestrator.

---

### Phase 4: Update AIPromptBuilder

**Goal**: Ensure prompt building respects capabilities early.

#### Task 4.1: Pass Capability Service to AIPromptBuilder

**File**: `lama.core/models/ai/AIPromptBuilder.ts`

Update constructor and buildPrompt to accept capability service:

```typescript
async buildPrompt(
  topicId: string,
  newMessage: string,
  options?: {
    modelId?: string;
    capabilityService?: LLMCapabilityService;
    // ... other options
  }
): Promise<PromptParts> {
  // Early capability resolution
  let capabilities: LLMCapabilities | undefined;
  if (options?.modelId && options?.capabilityService) {
    capabilities = await options.capabilityService.getCapabilities(options.modelId);
  }

  // Pass capabilities to prompt building
  // This allows tool/vision sections to be skipped at build time
  // rather than injecting then checking later
}
```

---

## Testing Strategy

### Unit Tests

1. **capability-resolver.ts**
   - Test both string array and object input formats
   - Test priority order (stored > known > default)
   - Test unknown model fallback

2. **llm-capability-service.ts**
   - Test caching behavior
   - Test resolution priority
   - Test individual capability checks
   - Test cache invalidation

3. **system-prompt-builder.ts**
   - Test tool injection with tool-capable model
   - Test tool skip with non-tool model
   - Test graceful handling when capability service unavailable

### Integration Tests

1. **End-to-end chat with llama3.2:3b** (no tools)
   - Verify no tool descriptions in prompt
   - Verify no tool processing attempt on response

2. **End-to-end chat with qwen2.5:7b** (with tools)
   - Verify tool descriptions in prompt
   - Verify tool calls processed

---

## Migration Path

### Backwards Compatibility

1. `resolveCapabilities()` accepts both `string[]` and `LLMCapabilities`
2. SystemPromptBuilder checks `llm.capabilities` array OR service
3. Existing LLM objects with string array format continue to work

### Gradual Rollout

1. **Week 1**: Ship Phase 1 (unified format) + Phase 2 (capability service)
2. **Week 2**: Monitor for issues, fix edge cases
3. **Week 3**: Ship Phase 3 (remove legacy routing) after confirming adapter coverage
4. **Week 4**: Ship Phase 4 (AIPromptBuilder integration)

---

## Files Modified

| File | Change |
|------|--------|
| `lama.core/models/ai/types.ts` | Extend LLMCapabilities interface |
| `lama.core/services/ollama.ts` | Add `mapOllamaCapabilities()`, update discovery |
| `lama.core/services/capability-resolver.ts` | Handle both input formats |
| `lama.core/services/llm-capability-service.ts` | **NEW** - Central capability service |
| `lama.core/services/llm-manager.ts` | Integrate service, remove legacy routing |
| `lama.core/services/system-prompt-builder.ts` | Use capability service |
| `lama.core/models/ai/AIPromptBuilder.ts` | Pass capabilities at build time |
| `docs/LLM-CHAT-FLOW-ANALYSIS.md` | Update to reflect changes |

---

## Success Criteria

1. ✓ Single capability format (`LLMCapabilities`) throughout codebase
2. ✓ Single point of access (`LLMCapabilityService`) for capability queries
3. ✓ No duplicate capability fetching logic
4. ✓ No legacy routing in LLMManager
5. ✓ Tool descriptions only injected for tool-capable models
6. ✓ All existing tests pass
7. ✓ New capability-related tests added and passing

---

## Implementation Log

### Phase 1 - Completed 2026-01-31

**Task 1.1: Extended LLMCapabilities interface** ✅
- File: `lama.core/models/ai/types.ts`
- Added: `supportsCompletion`, `supportsStructuredOutput`, `supportsEmbeddings`
- Added JSDoc explaining canonical format

**Task 1.2: Added mapOllamaCapabilities()** ✅
- File: `lama.core/services/ollama.ts`
- Converts string array `['completion', 'tools']` to `LLMCapabilities` object
- Exported for use by discovery code

**Task 1.3: Updated resolveCapabilities()** ✅
- File: `lama.core/services/capability-resolver.ts`
- Added `isCapabilityArray()` type guard
- Added `convertCapabilityArray()` helper
- `resolveCapabilities()` now accepts both `string[]` and `LLMCapabilities`
- Updated KNOWN_CAPABILITIES with new fields
- Added `deepseek-r1` profile

**Bonus: Updated system-prompt-builder** ✅
- File: `lama.core/services/system-prompt-builder.ts`
- Tool capability check now handles both string array and object formats
- Backwards compatible with existing LLM objects

### Phase 2 - Completed 2026-01-31

**Task 2.1: Created LLMCapabilityService** ✅
- File: `lama.core/services/llm-capability-service.ts` (NEW)
- Single source of truth for model capabilities
- Resolution priority: cache → registry → storage → known profiles → defaults
- Methods: `getCapabilities()`, `supportsTools()`, `supportsVision()`, `supportsThinking()`, etc.
- Session-based caching with `invalidate()` and `clearCache()`

**Task 2.2: Integrated into LLMManager** ✅
- File: `lama.core/services/llm-manager.ts`
- Added `capabilityService` private field
- Initialized in constructor with registry + storage fallback
- Added `getCapabilityService()` getter
- Updated `chat()` to use capability service for tool check (not just `options.disableTools`)

**Task 2.3: Updated SystemPromptBuilder** ✅
- File: `lama.core/services/system-prompt-builder.ts`
- Added `LLMCapabilityService` import
- Added `modelId` and `capabilityService` to `SystemPromptContext` interface
- MCP tools section now prefers `capabilityService.supportsTools()` with llmManager fallback

### Phase 3 - Completed 2026-01-31

**Task 3.1: Created LMStudioAdapter** ✅
- File: `lama.core/services/llm-adapters/lmstudio-adapter.ts` (NEW)
- Wraps existing `lmstudio.ts` functions
- Uses OpenAI-compatible API format
- No API key required (local server)

**Task 3.2: Registered LMStudioAdapter** ✅
- File: `lama.core/services/llm-adapters/index.ts`
- Exported LMStudioAdapter class
- Added to `registerDefaultAdapters()`

**Task 3.3: Removed Legacy Routing** ✅
- File: `lama.core/services/llm-manager.ts`
- Replaced legacy `if/else if` chain with fail-fast error
- Now throws clear error when no adapter found

**Task 3.4: Marked Legacy Methods Deprecated** ✅
- File: `lama.core/services/llm-manager.ts`
- Added `@deprecated` JSDoc to:
  - `chatWithOllama()` - use OllamaAdapter
  - `chatWithLMStudio()` - use LMStudioAdapter
  - `chatWithClaude()` - use AnthropicAdapter
  - `chatWithOpenAI()` - use OpenAIAdapter
  - `chatWithLocal()` - use TransformersAdapter
- Methods kept for backwards compatibility but marked for future removal

### Phase 4 - Completed 2026-01-31

**Task 4.1: Updated AIPromptBuilder to pass capability service** ✅
- File: `lama.core/models/ai/AIPromptBuilder.ts`
- `buildSystemPrompt()` now gets capability service from llmManager
- Passes `capabilityService` in context to SystemPromptBuilder
- Single source of truth for capability resolution at prompt build time

**Task 4.2: Updated LLMManager legacy path** ✅
- File: `lama.core/services/llm-manager.ts`
- `enhanceMessagesWithContext()` call now passes `modelId` and `capabilityService`
- Legacy messages flow now properly checks capabilities for tool injection

---

## Completion Summary

### Problem Statement

The LLM chat flow had several architectural issues:
1. **Multiple capability sources** - Capabilities scattered across 4 different places
2. **Two incompatible formats** - String array `['completion', 'tools']` vs `LLMCapabilities` object
3. **Legacy routing code** - Redundant if/else if chain in LLMManager
4. **No single source of truth** - Inconsistent capability checks throughout codebase

### Solution

Implemented a 4-phase consolidation plan creating a unified capability system.

#### Phase 1: Unified Capability Format

| File | Change |
|------|--------|
| `models/ai/types.ts` | Extended `LLMCapabilities` with `supportsCompletion`, `supportsStructuredOutput`, `supportsEmbeddings` |
| `services/ollama.ts` | Added `mapOllamaCapabilities()` to convert string array → object |
| `services/capability-resolver.ts` | Handles both formats, added `deepseek-r1` profile |

#### Phase 2: Capability Service

New file: `services/llm-capability-service.ts`

```
LLMCapabilityService
├── getCapabilities(modelId)     → Full LLMCapabilities object
├── supportsTools(modelId)       → boolean
├── supportsVision(modelId)      → boolean
├── supportsThinking(modelId)    → boolean
├── supportsStreaming(modelId)   → boolean
├── supportsStructuredOutput()   → boolean
├── getContextWindow(modelId)    → number
├── getHints(modelId)            → string[]
├── invalidate(modelId)          → Clear cache for model
└── clearCache()                 → Clear all cached capabilities
```

Resolution priority: Cache → Registry → Storage → Known profiles → Defaults

#### Phase 3: Remove Legacy Code

| Change | Description |
|--------|-------------|
| New adapter | Created `LMStudioAdapter` for LM Studio provider |
| Legacy routing removed | Replaced if/else if chain with fail-fast error |
| Deprecated methods removed | `chatWithOllama`, `chatWithLMStudio`, `chatWithClaude`, `chatWithOpenAI`, `chatWithLocal` |

Adapter coverage now complete:

| Provider | Adapter |
|----------|---------|
| anthropic | AnthropicAdapter |
| openai | OpenAIAdapter |
| ollama | OllamaAdapter |
| lmstudio | LMStudioAdapter ✨ |
| local/ondevice | TransformersAdapter |

#### Phase 4: Prompt Building Integration

| File | Change |
|------|--------|
| `AIPromptBuilder.ts` | Passes `capabilityService` to SystemPromptBuilder |
| `llm-manager.ts` | Legacy `enhanceMessagesWithContext` path includes capability service |

### Metrics

| Metric | Value |
|--------|-------|
| Files modified | 10 |
| New files | 2 (`llm-capability-service.ts`, `lmstudio-adapter.ts`) |
| Lines added | ~850 |
| Lines removed | ~290 (legacy code) |
| Commits | 2 |

### Commits

- `cb41431b` feat(llm): consolidate capability handling with single source of truth
- `2c39a40e` refactor(llm): remove deprecated chatWith* methods from LLMManager

### Benefits

1. **Single source of truth** - `LLMCapabilityService` for all capability queries
2. **Consistent format** - `LLMCapabilities` object throughout codebase
3. **No duplicate code** - One capability fetching implementation
4. **Clean routing** - Adapter pattern only, no legacy fallbacks
5. **Better tool handling** - Tools only injected for capable models
6. **Session caching** - Capabilities cached per session for performance
