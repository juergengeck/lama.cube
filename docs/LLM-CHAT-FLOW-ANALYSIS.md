# LLM Chat Flow Analysis

A comprehensive analysis of the LLM chat flow in lama.cube and lama.core, identifying architectural issues and recommending improvements.

## Table of Contents

1. [Discovery Flow](#1-discovery-flow)
2. [Chat Flow](#2-chat-flow)
3. [Tool Capability Checking](#3-tool-capability-checking)
4. [Architectural Issues](#4-architectural-issues)
5. [Recommendations](#5-recommendations)

---

## 1. Discovery Flow

### Overview

Model discovery happens through multiple paths, with capabilities fetched from Ollama's `/api/show` endpoint.

### Entry Points

| Entry Point | File | Line | Description |
|-------------|------|------|-------------|
| IPC `ai:getModels` | `main/ipc/plans/ai.ts` | :112 | UI requests available models |
| IPC `ai:discoverOllamaModels` | `main/ipc/plans/ai.ts` | :435 | Manual Ollama discovery |
| IPC `ai:discoverClaudeModels` | `main/ipc/plans/ai.ts` | :395 | Manual Claude discovery |

### Discovery Flow Diagram

```
UI Request (ai:getModels)
         |
         v
+------------------+
| aiPlans.getModels|  main/ipc/plans/ai.ts:112
+------------------+
         |
         +--------> llmManager.discoverOllamaModels()
         |          lama.core/services/llm-manager.ts:1712
         |                    |
         |                    v
         |          +------------------------+
         |          | getLocalOllamaModels() |  lama.core/services/ollama.ts:613
         |          +------------------------+
         |                    |
         |                    +---> GET /api/tags (list models)
         |                    |
         |                    +---> POST /api/show (fetch capabilities per model)
         |                    |     lama.core/services/ollama.ts:572
         |                    |
         |                    v
         |          Capabilities: ['completion', 'tools', 'vision', ...]
         |                    |
         |                    v
         |          +------------------------+
         |          | llmRegistry.register() |  lama.core/services/llm-registry.ts:76
         |          +------------------------+
         |                    |
         |                    v
         |          LLM object stored with capabilities
         |
         +--------> llmManager.discoverClaudeModels()
         |          (hardcoded model list)
         |
         +--------> localModelsPlans.listTextGenModels()
                    (on-device ONNX models)
```

### Capability Fetching

**Where capabilities are fetched:**

| Location | File | Line | Method |
|----------|------|------|--------|
| Ollama discovery | `lama.core/services/ollama.ts` | :572 | `fetchModelCapabilities()` |
| Ollama validator | `lama.cube/main/services/ollama-validator.ts` | :192 | `fetchOllamaModelCapabilities()` |

**ISSUE: Duplicate capability fetching logic** - Both files implement the same `/api/show` call.

**Where capabilities are stored:**

| Storage | File | Line |
|---------|------|------|
| LLMRegistry (in-memory) | `lama.core/services/llm-registry.ts` | :76 |
| LLM object | `lama.core/services/llm-manager.ts` | :1751 |

### Capability Types

From Ollama `/api/show`:
- `completion` - Basic text completion
- `tools` - Native tool/function calling support
- `thinking` - Chain-of-thought reasoning
- `vision` - Image understanding

---

## 2. Chat Flow

### High-Level Flow

```
User sends message
         |
         v
+-------------------+
| AIAssistantPlan   |  lama.core/plans/AIAssistantPlan.ts:1081
| .chatWithAnalysis |
+-------------------+
         |
         v
+-------------------+
| AIMessageProcessor|  lama.core/models/ai/AIMessageProcessor.ts
| .processMessage() |
+-------------------+
         |
         v
+-------------------+
| AIPromptBuilder   |  lama.core/models/ai/AIPromptBuilder.ts:139
| .buildPrompt()    |
+-------------------+
         |
         +---> buildContextWithinBudget()
         |     (abstraction-based context management)
         |
         v
+-------------------+
| LLMManager.chat() |  lama.core/services/llm-manager.ts:592
+-------------------+
         |
         +---> Get LLM from registry/storage (:600-610)
         |
         +---> Check tool support (:674-686)
         |
         +---> Get adapter from registry (:750)
         |
         v
+-------------------+
| LLMAdapter.chat() |  e.g., OllamaAdapter
+-------------------+
         |
         v
+-------------------+
| chatWithOllama()  |  lama.core/services/ollama.ts:124
+-------------------+
         |
         v
POST /api/chat (streaming)
         |
         v
Response processing
         |
         v
+-------------------+
| processToolCalls()|  lama.core/services/llm-manager.ts:967
+-------------------+
         |
         +---> Parse JSON tool calls from response
         |
         +---> AIToolExecutor.execute() OR mcpManager.executeTool()
         |
         +---> ReACT loop (send result back to LLM)
         |
         v
Final response to UI
```

### Chat Entry Points

| Entry Point | File | Line | Description |
|-------------|------|------|-------------|
| IPC `ai:chat` | `main/ipc/plans/ai.ts` | :39 | Direct LLM chat |
| IPC `ai:processMessage` | `main/ipc/plans/ai.ts` | :598 | AI topic message processing |
| `AIAssistantPlan.chat()` | `lama.core/plans/AIAssistantPlan.ts` | :1043 | Simple chat |
| `AIAssistantPlan.chatWithAnalysis()` | `lama.core/plans/AIAssistantPlan.ts` | :1081 | Chat + Phase 2 analytics |

### Message Format Transformation

```
User Message
     |
     v
+------------------+
| AIPromptBuilder  |  Builds PromptParts structure
+------------------+
     |
     v
PromptParts {
  part1: system prompt (cacheable)
  part2: past subjects (cacheable)
  part3: current messages
  part4: new message
}
     |
     v
+---------------------+
| formatForStandardAPI|  For Ollama/OpenAI
| or                  |
| formatForAnthropic  |  For Claude (with cache_control)
+---------------------+
     |
     v
Final messages array for LLM API
```

### Adapter Selection

**File:** `lama.core/services/llm-adapters/registry.ts`

```typescript
// Selection priority (lines 43-84):
// 1. Exact match on provider
// 2. Match on inferenceType (ondevice/server/cloud)
// 3. canHandle() check fallback
```

| Provider | Adapter | File |
|----------|---------|------|
| `ollama` | OllamaAdapter | `llm-adapters/ollama-adapter.ts` |
| `anthropic` | AnthropicAdapter | `llm-adapters/anthropic-adapter.ts` |
| `openai` | OpenAIAdapter | `llm-adapters/openai-adapter.ts` |
| `transformers` | TransformersAdapter | `llm-adapters/transformers-adapter.ts` |

---

## 3. Tool Capability Checking

### Where Tools ARE Checked

| Location | File | Line | Check |
|----------|------|------|-------|
| chat() | `llm-manager.ts` | :674-686 | `capabilities.includes('tools')` |

```typescript
// llm-manager.ts:674-686
const modelCapabilities = (model as any).capabilities || [];
const modelSupportsTools = Array.isArray(modelCapabilities) &&
                           modelCapabilities.includes('tools');
let shouldDisableTools = (options as any)?.disableTools === true;

if (!shouldDisableTools && !modelSupportsTools) {
  shouldDisableTools = true;
  MessageBus.send('debug', `Tools disabled - model ${effectiveModelId} capabilities: [${modelCapabilities.join(', ')}]`);
}
```

### Where Tools SHOULD Be Checked But Aren't

| Issue | File | Line | Problem |
|-------|------|------|---------|
| SystemPromptBuilder | `system-prompt-builder.ts` | :202-217 | Injects tool descriptions regardless of model capability |
| MCP getCompactToolDescriptions | `mcp-manager.ts` | :682-706 | Always returns tool descriptions |
| AIPromptBuilder | `AIPromptBuilder.ts` | :228 | Builds system prompt without capability check |

**Consequence:** Models without tool support receive tool descriptions in their system prompt, wasting context tokens and potentially causing confusion.

### Tool Processing Flow

```
LLM Response
     |
     +---> Check shouldDisableTools flag
     |     (llm-manager.ts:848)
     |
     +---> If tools enabled:
           |
           +---> Parse JSON from response (:983-992)
           |     - Try ```json blocks
           |     - Try plain JSON with "tool" key
           |
           +---> Route tool call:
                 |
                 +---> AIToolExecutor (if context.callerId set)
                 |     - plan:* -> PlanRouter
                 |     - mcp:* -> MCPManager
                 |
                 +---> mcpManager.executeTool() (fallback)
                 |
                 +---> ReACT: Send result back to LLM (:1173-1199)
```

### AIToolExecutor vs MCPManager

| Executor | File | When Used |
|----------|------|-----------|
| AIToolExecutor | `lama.core/services/AIToolExecutor.ts` | When `context.callerId` is set |
| MCPManager | `lama.cube/main/services/mcp-manager.ts` | Fallback, direct MCP access |

**AIToolExecutor routing:**
- `plan:domain:method` -> PlanRouter (internal plans)
- `mcp:server:tool` -> MCPManager (external MCP servers)

---

## 4. Architectural Issues

### Issue 1: Duplicate Capability Fetching

**Files:**
- `lama.core/services/ollama.ts:572` - `fetchModelCapabilities()`
- `lama.cube/main/services/ollama-validator.ts:192` - `fetchOllamaModelCapabilities()`

**Problem:** Both implement identical `/api/show` calls, violating DRY.

**Impact:** Maintenance burden, potential for divergence.

### Issue 2: Tool Descriptions Injected Without Capability Check

**File:** `lama.core/services/system-prompt-builder.ts:202-217`

```typescript
// Section 7: MCP Tools (Priority 100)
this.register({
  name: 'mcp-tools',
  priority: 100,
  enabled: true,
  generate: () => {
    // NO capability check here!
    const compact = this.mcpManager.getCompactToolDescriptions?.();
    return compact || verbose || '';
  }
});
```

**Problem:** Tool descriptions added to system prompt even for models that don't support tools.

**Impact:** Wasted context tokens, potential model confusion.

### Issue 3: Multiple Capability Sources

**Sources:**
1. LLM Registry (in-memory) - `llm-registry.ts`
2. LLM object in storage - via `getLLMFromStorage()`
3. Adapter capabilities - `AdapterCapabilities` on each adapter
4. Hardcoded profiles - `capability-resolver.ts:12-98`

**Problem:** No single source of truth for capabilities.

### Issue 4: Legacy/Fallback Code Paths

**File:** `lama.core/services/llm-manager.ts:791-808`

```typescript
// Fallback to legacy routing (will be removed once all adapters are registered)
const inferenceType = llmObject.inferenceType;

if (inferenceType === 'ondevice') {
  response = await this.chatWithLocal(model as any, enhancedMessages, options)
} else if ((model as any).provider === 'ollama') {
  response = await this.chatWithOllama(model as any, enhancedMessages, { ...options, promptParts })
}
// ... more fallbacks
```

**Problem:** Both adapter-based and legacy routing exist, duplicating logic.

### Issue 5: Capability Check Timing

**Current:** Capabilities checked at chat() time (runtime).

**Problem:** System prompt already built with tools before capability check runs.

**Sequence:**
1. `AIPromptBuilder.buildPrompt()` - Includes tool descriptions
2. `LLMManager.chat()` - Checks capabilities, disables tool processing
3. Tool descriptions already in prompt (wasted tokens)

### Issue 6: Context Duplication in Adapters

**OllamaAdapter** (`ollama-adapter.ts:68`) and **LLMManager** (`llm-manager.ts:1302-1326`) both cache Ollama context:

```typescript
// OllamaAdapter
private contextCache: Map<string, number[]> = new Map();

// LLMManager
private ollamaContextCache: Map<string, number[]> = new Map();
```

**Problem:** Two independent context caches for the same data.

---

## 5. Recommendations

### R1: Unify Capability Fetching

**Action:** Delete `lama.cube/main/services/ollama-validator.ts:fetchOllamaModelCapabilities()` and use `lama.core/services/ollama.ts:fetchModelCapabilities()` everywhere.

### R2: Add Capability Check to System Prompt Building

**File to modify:** `lama.core/services/system-prompt-builder.ts`

```typescript
// Section 7: MCP Tools (Priority 100)
this.register({
  name: 'mcp-tools',
  priority: 100,
  enabled: true,
  generate: async (context?: SystemPromptContext) => {
    // CHECK CAPABILITY FIRST
    if (context?.modelId && context.llmManager) {
      const llm = await context.llmManager.getModel(context.modelId);
      const capabilities = llm?.capabilities || [];
      if (!capabilities.includes('tools')) {
        return ''; // Skip tool injection for non-tool models
      }
    }

    return this.mcpManager?.getCompactToolDescriptions() || '';
  }
});
```

### R3: Create Single Capability Source

**Proposed structure:**

```typescript
// lama.core/services/llm-capabilities.ts
interface LLMCapabilities {
  tools: boolean;
  vision: boolean;
  thinking: boolean;
  streaming: boolean;
  structuredOutput: boolean;
  contextWindow: number;
}

function getCapabilities(modelId: string): LLMCapabilities {
  // 1. Check registry first (discovery-time capabilities)
  // 2. Fall back to known profiles
  // 3. Default to conservative capabilities
}
```

### R4: Remove Legacy Routing

**File:** `lama.core/services/llm-manager.ts`

**Action:** Remove lines 791-808 (legacy fallback routing) once all adapters are properly registered.

### R5: Move Capability Check Earlier

**Proposed flow:**

```
buildPrompt(topicId, message, modelId)
         |
         +---> getCapabilities(modelId)  // NEW
         |
         +---> If !capabilities.tools, skip tool section
         |
         v
   System prompt WITHOUT tools if not supported
```

### R6: Consolidate Context Caching

**Action:** Remove `OllamaAdapter.contextCache` and use `LLMManager.ollamaContextCache` exclusively via options passing.

---

## Appendix: Key File References

### lama.cube

| File | Purpose |
|------|---------|
| `main/ipc/plans/ai.ts` | IPC handlers for AI operations |
| `main/services/llm-manager-singleton.ts` | Creates LLMManager singleton |
| `main/services/ollama-validator.ts` | Ollama connection testing |
| `main/services/mcp-manager.ts` | MCP server management |

### lama.core

| File | Purpose |
|------|---------|
| `services/llm-manager.ts` | Core LLM orchestration |
| `services/ollama.ts` | Ollama API communication |
| `services/llm-registry.ts` | In-memory LLM tracking |
| `services/llm-adapters/registry.ts` | Adapter selection |
| `services/llm-adapters/ollama-adapter.ts` | Ollama chat adapter |
| `services/system-prompt-builder.ts` | System prompt composition |
| `services/AIToolExecutor.ts` | Unified tool execution |
| `services/capability-resolver.ts` | Capability profiles |
| `plans/AIAssistantPlan.ts` | AI assistant orchestration |
| `models/ai/AIPromptBuilder.ts` | Prompt construction |
| `models/ai/AIMessageProcessor.ts` | Message processing |

---

## Summary

The current architecture has grown organically with multiple paths for:
- Discovery (3+ entry points)
- Chat (4+ entry points)
- Capability checking (checked in chat(), not in prompt building)
- Tool execution (AIToolExecutor and MCPManager)

Key improvements needed:
1. **Unify capability source** - Single place to check model capabilities
2. **Check capabilities at prompt build time** - Don't inject tools for non-tool models
3. **Remove duplicate code** - Especially ollama-validator.ts duplicates
4. **Complete adapter migration** - Remove legacy routing in LLMManager
5. **Consolidate caches** - One context cache, not two
