# Unified Plan Router with Policy Engine

## Overview

Consolidate all routing/matching engines into a single Plan-based switchboard with an integrated policy engine for access control, rate limiting, and audit.

**Date:** 2025-12-07
**Status:** Design

## Problem Statement

We currently have 8 separate matching engines:

| Engine | Location | Pattern | Duplication |
|--------|----------|---------|-------------|
| IPC Controller | lama.cube | Map lookup | Unique |
| Tool Executor | mcp.core | Switch (50+ cases) | Duplicates #3 |
| MCP Local Server | mcp.core | Switch (50+ cases) | Duplicates #2 |
| Plan Registry | mcp.core | Dynamic invocation | Core - keep |
| Plan Meta-Tools | mcp.core | Two-tier routing | Thin wrapper |
| Action Handler | lama.cube | Switch (4 cases) | Legacy |
| MCP Remote Handler | mcp.core | Validation chain | Unique concern |
| AI Task Manager | lama.core | Map config | Different purpose |

**Issues:**
1. **Duplication**: Tool Executor and MCP Local Server have nearly identical 50+ case switch statements
2. **No unified policy**: Each entry point implements its own access control (or none)
3. **Hard to extend**: Adding a new capability requires updating multiple switch statements
4. **No audit trail**: No single point to log all operations

## Proposed Architecture

### Single Switchboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Entry Points                                  │
├──────────────┬──────────────┬───────────────┬──────────────────────┤
│   IPC Call   │   MCP Tool   │  Remote MCP   │     HTTP API         │
│  chat:send   │   call_plan  │  MCPRequest   │   /api/plans         │
└──────┬───────┴──────┬───────┴───────┬───────┴──────────┬───────────┘
       │              │               │                  │
       └──────────────┴───────────────┴──────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Request Context    │
                    │  - caller identity    │
                    │  - entry point type   │
                    │  - topic/scope        │
                    │  - timestamp          │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Policy Engine      │
                    │  - access control     │
                    │  - rate limiting      │
                    │  - capability check   │
                    │  - audit logging      │
                    └───────────┬───────────┘
                                │
                         [ALLOW/DENY]
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Plan Router        │
                    │  planRegistry.call()  │
                    └───────────┬───────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
    ┌─────────┐           ┌──────────┐           ┌─────────┐
    │ChatPlan │           │  AIPlan  │           │ MCPPlan │
    └─────────┘           └──────────┘           └─────────┘
```

### Components

#### 1. Request Context

Every request carries context about its origin:

```typescript
interface RequestContext {
  // Who is calling
  callerId: string;              // Person ID or 'system'
  callerType: 'user' | 'llm' | 'remote' | 'system';

  // How they're calling
  entryPoint: 'ipc' | 'mcp-local' | 'mcp-remote' | 'http' | 'internal';

  // What scope
  topicId?: string;              // If topic-scoped
  conversationId?: string;       // If conversation-scoped

  // When
  timestamp: number;
  requestId: string;             // For tracing

  // Credentials (for remote)
  credential?: MCPCredential;
}
```

#### 2. Policy Engine

Central policy enforcement before any plan method executes:

```typescript
interface PolicyEngine {
  // Check if request is allowed
  evaluate(
    context: RequestContext,
    plan: string,
    method: string,
    params: any
  ): Promise<PolicyDecision>;

  // Register policy rules
  addRule(rule: PolicyRule): void;
  removeRule(ruleId: string): void;

  // Audit
  getAuditLog(filter: AuditFilter): Promise<AuditEntry[]>;
}

interface PolicyDecision {
  allowed: boolean;
  reason?: string;

  // Optional modifications
  filteredParams?: any;      // Redact sensitive params
  rateLimit?: RateLimitInfo; // Apply rate limiting
  audit?: boolean;           // Force audit this call
}

interface PolicyRule {
  id: string;
  name: string;
  priority: number;          // Higher = evaluated first

  // Matching conditions
  conditions: {
    callerTypes?: ('user' | 'llm' | 'remote' | 'system')[];
    entryPoints?: ('ipc' | 'mcp-local' | 'mcp-remote' | 'http')[];
    plans?: string[];        // Plan name patterns
    methods?: string[];      // Method name patterns
    topicIds?: string[];     // Specific topics
  };

  // Actions
  action: 'allow' | 'deny' | 'allow-with-audit' | 'rate-limit';

  // Rate limit config (if action is rate-limit)
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
    keyBy: 'caller' | 'topic' | 'method';
  };
}
```

#### 3. Plan Router

Enhanced PlanRegistry that integrates with Policy Engine:

```typescript
class PlanRouter {
  private registry: PlanRegistry;
  private policy: PolicyEngine;

  async call(
    context: RequestContext,
    plan: string,
    method: string,
    params: any
  ): Promise<PlanResult> {
    // 1. Check policy
    const decision = await this.policy.evaluate(context, plan, method, params);

    if (!decision.allowed) {
      throw new PolicyDeniedError(decision.reason);
    }

    // 2. Apply param filtering if needed
    const safeParams = decision.filteredParams ?? params;

    // 3. Audit if required
    if (decision.audit) {
      await this.auditLog(context, plan, method, safeParams);
    }

    // 4. Execute
    const result = await this.registry.callPlanMethod(plan, method, safeParams);

    // 5. Post-execution audit
    if (decision.audit) {
      await this.auditResult(context, plan, method, result);
    }

    return result;
  }
}
```

### Entry Point Adapters

Each entry point creates appropriate context and delegates to PlanRouter:

#### IPC Adapter

```typescript
// lama.cube/main/ipc/plan-adapter.ts

class IPCPlanAdapter {
  constructor(private router: PlanRouter, private getMyPersonId: () => string) {}

  // Convert IPC channel to plan call
  // e.g., 'chat:sendMessage' → { plan: 'chat', method: 'sendMessage' }
  parseChannel(channel: string): { plan: string; method: string } {
    const [plan, method] = channel.split(':');
    return { plan, method };
  }

  createHandler(channel: string): IPCHandler {
    const { plan, method } = this.parseChannel(channel);

    return async (event: IpcMainInvokeEvent, params: any) => {
      const context: RequestContext = {
        callerId: this.getMyPersonId(),
        callerType: 'user',
        entryPoint: 'ipc',
        topicId: params.topicId || params.conversationId,
        timestamp: Date.now(),
        requestId: crypto.randomUUID()
      };

      return await this.router.call(context, plan, method, params);
    };
  }
}
```

#### MCP Local Adapter

```typescript
// mcp.core/src/local/MCPPlanAdapter.ts

class MCPPlanAdapter {
  constructor(private router: PlanRouter) {}

  async handleToolCall(name: string, args: any, mcpContext: any): Promise<MCPToolResult> {
    // call_plan is the universal entry point
    if (name === 'call_plan') {
      const context: RequestContext = {
        callerId: 'llm',
        callerType: 'llm',
        entryPoint: 'mcp-local',
        topicId: mcpContext.topicId,
        timestamp: Date.now(),
        requestId: crypto.randomUUID()
      };

      const result = await this.router.call(
        context,
        args.plan,
        args.method,
        args.params || {}
      );

      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }

    // Legacy tool names map to plan methods
    // e.g., 'send_message' → { plan: 'chat', method: 'sendMessage' }
    const { plan, method } = this.mapLegacyTool(name);
    // ... same as above
  }
}
```

#### MCP Remote Adapter

```typescript
// mcp.core/src/local/MCPRemotePlanAdapter.ts

class MCPRemotePlanAdapter {
  constructor(
    private router: PlanRouter,
    private supplyManager: MCPSupplyManager
  ) {}

  async handleRequest(
    request: MCPRequest,
    senderPersonId: string,
    topicId: string
  ): Promise<void> {
    // Build context with credential
    const credential = this.supplyManager.getCredential(topicId, senderPersonId);

    const context: RequestContext = {
      callerId: senderPersonId,
      callerType: 'remote',
      entryPoint: 'mcp-remote',
      topicId,
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
      credential
    };

    // Policy engine will check credential validity
    const toolCall = await getObject(request.toolCall);
    const { plan, method } = this.parseToolName(toolCall.toolName);

    const result = await this.router.call(
      context,
      plan,
      method,
      JSON.parse(toolCall.parameters)
    );

    // Send response...
  }
}
```

### Default Policy Rules

```typescript
const defaultRules: PolicyRule[] = [
  // System calls always allowed
  {
    id: 'system-allow-all',
    name: 'Allow system calls',
    priority: 1000,
    conditions: { callerTypes: ['system'] },
    action: 'allow'
  },

  // Local user IPC calls allowed
  {
    id: 'ipc-user-allow',
    name: 'Allow local user IPC',
    priority: 900,
    conditions: {
      callerTypes: ['user'],
      entryPoints: ['ipc']
    },
    action: 'allow'
  },

  // Local LLM MCP calls allowed with audit
  {
    id: 'mcp-local-llm-audit',
    name: 'Allow local LLM with audit',
    priority: 800,
    conditions: {
      callerTypes: ['llm'],
      entryPoints: ['mcp-local']
    },
    action: 'allow-with-audit'
  },

  // Remote MCP requires valid credential (handled by policy engine)
  {
    id: 'mcp-remote-credential',
    name: 'Remote requires credential',
    priority: 700,
    conditions: {
      entryPoints: ['mcp-remote']
    },
    action: 'allow',  // Credential check is built into policy engine
  },

  // Rate limit remote calls
  {
    id: 'mcp-remote-rate-limit',
    name: 'Rate limit remote calls',
    priority: 600,
    conditions: {
      entryPoints: ['mcp-remote']
    },
    action: 'rate-limit',
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000,  // 1 minute
      keyBy: 'caller'
    }
  },

  // Sensitive methods require audit
  {
    id: 'sensitive-methods-audit',
    name: 'Audit sensitive operations',
    priority: 500,
    conditions: {
      methods: ['delete*', 'remove*', 'revoke*']
    },
    action: 'allow-with-audit'
  },

  // Default deny
  {
    id: 'default-deny',
    name: 'Default deny',
    priority: 0,
    conditions: {},
    action: 'deny'
  }
];
```

### Plan Method Metadata

Enhance plan methods with decorators for better LLM descriptions and policy hints:

```typescript
// Decorator approach
class ChatPlan {
  @PlanMethod({
    description: 'Send a message to a conversation',
    params: {
      conversationId: { type: 'string', required: true, description: 'Target conversation' },
      message: { type: 'string', required: true, description: 'Message content' }
    },
    returns: { type: 'Message', description: 'The sent message' },
    policyHints: {
      requiresTopicAccess: true,
      auditLevel: 'normal'
    }
  })
  async sendMessage(params: { conversationId: string; message: string }): Promise<Message> {
    // ...
  }
}

// Or metadata object approach (no decorators needed)
const ChatPlanMeta = {
  sendMessage: {
    description: 'Send a message to a conversation',
    params: {
      conversationId: { type: 'string', required: true },
      message: { type: 'string', required: true }
    },
    policyHints: { requiresTopicAccess: true }
  }
};
```

### Audit Log Schema

```typescript
interface AuditEntry {
  id: string;
  timestamp: number;

  // Request
  requestId: string;
  callerId: string;
  callerType: 'user' | 'llm' | 'remote' | 'system';
  entryPoint: 'ipc' | 'mcp-local' | 'mcp-remote' | 'http';

  // Operation
  plan: string;
  method: string;
  params: any;  // May be redacted

  // Context
  topicId?: string;
  credentialId?: string;

  // Result
  decision: 'allowed' | 'denied';
  denyReason?: string;
  executionTimeMs?: number;
  success?: boolean;
  error?: string;

  // Policy
  matchedRules: string[];  // Rule IDs that matched
}
```

### Implementation Plan

#### Phase 1: Core Infrastructure

1. Create `PolicyEngine` class with ONE.core storage
2. Create `PlanRouter` wrapper around existing `PlanRegistry`
3. Create `AuditLogger` with ONE.core storage
4. Add default policy rules as ONE.core objects
5. Integrate cube.core reactive updates for hot reload

#### Phase 2: Adapters & Cut-over

1. Create `IPCPlanAdapter` - replace IPC Controller routing
2. Create `MCPLocalAdapter` - replace MCP Local Server switch
3. Create `MCPRemoteAdapter` - replace MCP Remote Handler
4. Delete Tool Executor (entire file)
5. Delete switch statements from MCP Local Server
6. Delete Action Handler

#### Phase 3: Enhanced Features

1. Add rate limiting implementation
2. Add credential-based access control (integrates with MCP supply/demand)
3. Add admin UI for policy management
4. Add audit log viewer

## File Structure

```
mcp.core/src/
├── router/
│   ├── PlanRouter.ts           # Main router
│   ├── RequestContext.ts       # Context types
│   └── adapters/
│       ├── IPCAdapter.ts       # IPC → PlanRouter
│       ├── MCPLocalAdapter.ts  # MCP local → PlanRouter
│       ├── MCPRemoteAdapter.ts # MCP remote → PlanRouter
│       └── HTTPAdapter.ts      # HTTP → PlanRouter
├── policy/
│   ├── PolicyEngine.ts         # Policy evaluation
│   ├── PolicyRule.ts           # Rule types
│   ├── RateLimiter.ts          # Rate limiting
│   ├── CredentialChecker.ts    # Credential validation
│   └── DefaultRules.ts         # Default policy rules
├── audit/
│   ├── AuditLogger.ts          # Audit logging
│   ├── AuditEntry.ts           # Entry types
│   └── AuditStore.ts           # Storage (ONE.core)
└── tools/
    ├── PlanRegistry.ts         # Existing (enhanced)
    └── PlanMetaTools.ts        # Existing (uses router)
```

## Benefits

1. **Single routing path**: All entry points use same infrastructure
2. **Unified policy**: One place to define and enforce access control
3. **Complete audit**: Every operation logged through single point
4. **Easy extension**: New plans auto-discovered, no switch updates
5. **Rate limiting**: Prevent abuse from any entry point
6. **Credential integration**: MCP supply/demand uses same policy engine
7. **LLM-friendly**: Better method metadata for tool discovery

## Decisions

1. **Policy storage**: ONE.core - there can be only one source of truth
2. **Hot reload**: Yes, using cube.core reactive patterns for dynamic updates
3. **Performance**: Accepted overhead for unified policy enforcement
4. **Backward compat**: None. No legacy fallbacks. Clean cut-over.

## Related Documents

- `2025-12-07-mcp-local-remote-refactor-design.md` - MCP supply/demand design
- `specs/021-ai-assistant-core-refactor/` - AI assistant architecture
