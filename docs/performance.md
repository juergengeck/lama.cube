# Performance Optimization Guide

## Streaming Response Performance

### Current Status (2025-01-09)

**Optimization Complete: Debounce Delay Reduction**

We've reduced the channel update debounce delay from 800ms to 50ms for local AI responses, providing an immediate **~750ms improvement** in streaming latency.

**Location**: `main/core/ai-message-listener.ts:28`

```typescript
this.DEBOUNCE_MS = 50 // Minimal delay for local AI - just enough to batch rapid updates
```

**Rationale**: The original 800ms delay was designed to ensure user messages display first, but this is unnecessarily high for local AI models (Ollama). Since there's no network latency with local models, we can use a much smaller debounce to batch rapid updates while maintaining responsiveness.

### Streaming Flow Architecture

```
User sends message
    ↓
IPC to main process (Node.js)
    ↓
AIAssistantPlan.processMessage()
    ↓
LLM generates response (Ollama)
    ↓
Chunks received from Ollama
    ↓ [50ms debounce]
Channel update listener fires
    ↓
IPC event: 'message:stream'
    ↓
Renderer process receives chunk
    ↓
UI updates
```

### Key Timing Points

1. **DEBOUNCE_MS (50ms)** - Channel update debounce in `ai-message-listener.ts:28`
   - **Previous**: 800ms
   - **Current**: 50ms
   - **Improvement**: ~750ms faster response start

2. **IPC Overhead** - Each chunk serialization/deserialization
   - Relatively low overhead for local AI
   - Could be optimized with chunk batching (future work)

3. **Ollama Response Time**
   - TTFB (Time To First Byte): Variable by model
   - Chunk interval: Model-dependent
   - Local execution: No network latency

### Performance Instrumentation Plan

**Future Work**: Add comprehensive timing instrumentation to measure exact latencies.

#### Recommended Instrumentation Points

1. **Message Send → LLM Start**
   ```typescript
   const t0 = performance.now();
   console.log(`[PERF] Message received: ${t0}ms`);
   ```

2. **LLM Start → First Chunk**
   ```typescript
   const ttfb = performance.now() - t0;
   console.log(`[PERF] TTFB: ${ttfb}ms`);
   ```

3. **Chunk → IPC Send**
   ```typescript
   const ipcStart = performance.now();
   // IPC call
   const ipcLatency = performance.now() - ipcStart;
   console.log(`[PERF] IPC latency: ${ipcLatency}ms`);
   ```

4. **IPC Send → UI Update**
   ```typescript
   // In renderer
   const renderStart = performance.now();
   // UI update
   const renderTime = performance.now() - renderStart;
   console.log(`[PERF] Render time: ${renderTime}ms`);
   ```

#### Files to Instrument

- `lama.core/plans/AIAssistantPlan.ts` - Message processing entry point
- `adapters/electron-llm-platform.ts` - IPC streaming coordination
- `main/services/ollama.ts` - Ollama chunk reception
- `electron-ui/src/components/ChatView.tsx` - UI rendering

### Potential Future Optimizations

#### 1. Chunk Batching (IPC Overhead Reduction)

**Problem**: Each small chunk goes through IPC serialization individually.

**Solution**: Batch multiple small chunks together to reduce IPC overhead.

```typescript
// Pseudocode
const chunkBuffer = [];
const BATCH_INTERVAL = 16; // ~60fps

function onChunk(chunk) {
  chunkBuffer.push(chunk);

  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      sendBatchedChunks(chunkBuffer);
      chunkBuffer.length = 0;
      batchTimer = null;
    }, BATCH_INTERVAL);
  }
}
```

**Benefit**: Reduces IPC calls, smoother rendering

**Trade-off**: Adds 16ms max latency per chunk

#### 2. Direct Streaming to Renderer

**Problem**: Storage operations are synchronous with streaming.

**Solution**: Stream directly to renderer, store asynchronously in Node.js.

```typescript
// Stream to UI immediately
streamToRenderer(chunk);

// Store in background (don't await)
storeChunkAsync(chunk).catch(console.error);
```

**Benefit**: Zero storage latency in streaming path

**Trade-off**: Requires careful error handling, eventual consistency

#### 3. WebSocket Direct to Renderer

**Problem**: IPC adds serialization overhead.

**Solution**: For very high-throughput scenarios, use WebSocket between main and renderer.

**Benefit**: Lower latency than IPC for streaming

**Trade-off**: More complex architecture, only needed for extremely high throughput

### Measurement Methodology

To properly measure performance:

1. **Cold Start**: Measure from app launch to first response
2. **Warm Response**: Measure subsequent responses
3. **Model Variance**: Test with different model sizes (2b, 8b, 20b)
4. **Chunk Size**: Measure with different chunk sizes
5. **Concurrent Requests**: Test with multiple simultaneous chats

### Benchmarking Commands

```bash
# Start with timing logs
npm run electron 2>&1 | grep -E "PERF|timing" | tee /tmp/perf.log

# Analyze timing
grep "TTFB" /tmp/perf.log | awk '{sum+=$NF; count++} END {print "Avg TTFB:", sum/count, "ms"}'
grep "IPC latency" /tmp/perf.log | awk '{sum+=$NF; count++} END {print "Avg IPC:", sum/count, "ms"}'
```

### Configuration Tuning

```typescript
// ai-message-listener.ts
DEBOUNCE_MS = 50;    // Balance: batching vs latency
                     // - Lower: More responsive, more CPU
                     // - Higher: Less CPU, more latency
                     // - Optimal for local AI: 50-100ms

// Future: Make configurable per deployment
// - Local AI: 50ms
// - Remote API (Claude, GPT): 100-200ms
// - Self-hosted (network latency): 100-150ms
```

### Known Bottlenecks

1. ✅ **Channel Update Debounce** - FIXED (800ms → 50ms)
2. ⚠️ **IPC Serialization** - Minor, could optimize with batching
3. ❓ **Storage Operations** - Unknown, needs instrumentation
4. ❓ **Ollama Model Speed** - Model-dependent, not controllable

### Testing Checklist

When testing streaming performance:

- [ ] Verify debounce is 50ms (check logs on startup)
- [ ] Test with small model (2b) for baseline
- [ ] Test with large model (20b) for worst case
- [ ] Monitor CPU usage during streaming
- [ ] Check memory usage over extended session
- [ ] Test with multiple concurrent chats
- [ ] Verify no message loss or corruption
- [ ] Test reconnection scenarios

### Related Files

- `main/core/ai-message-listener.ts` - Channel update listener (debounce config)
- `lama.core/plans/AIAssistantPlan.ts` - Main message processing
- `adapters/electron-llm-platform.ts` - IPC streaming bridge
- `main/services/ollama.ts` - Ollama service integration
- `electron-ui/src/components/ChatView.tsx` - UI rendering
- `electron-ui/src/hooks/useLamaMessages.ts` - Message state management

### References

- Architecture: `docs/ARCHITECTURE.md`
- IPC Patterns: `lama.cube/CLAUDE.md`
- Streaming Protocol: `specs/*/streaming-protocol.md` (if exists)

---

**Last Updated**: 2025-01-09
**Status**: Debounce optimization complete, instrumentation planned
**Priority**: Low (other priorities take precedence)
