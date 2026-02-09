/**
 * MCP Server Initialization
 *
 * Wires modules to the global PlanRegistry and starts MCP stdio server.
 * Called after ModuleRegistry.initAll() completes.
 *
 * Uses the global planRegistry singleton — same registry that AIModule,
 * PlanRouter, and PlanMetaTools use. One registry, one registration site.
 */

import { planRegistry, type PlanRegistry, type Plan } from '@refinio/api/registry';
// Import directly to avoid barrel export pulling in rest-server.js (requires express)
import { McpStdioServer } from '@refinio/api/servers/mcp-stdio-server.js';
import type { ModuleRegistry } from '@refinio/api/plan-system';

// Module types - import dynamically to avoid circular deps
import type { AIModule } from '@refinio/lama.core/modules';
import type { MemoryModule } from '@refinio/lama.core/modules';
import type { ChatModule } from '@refinio/lama.core/modules';
import type { ConnectionModule } from '@refinio/lama.core/modules';
import type { CoreModule } from '@refinio/lama.core/modules';

let mcpServer: McpStdioServer | null = null;

/**
 * Wire modules to PlanRegistry
 *
 * Registers handlers from initialized modules into the global planRegistry.
 * Registration is idempotent — safe to call on re-login.
 */
export function wireModulesToRegistry(moduleRegistry: ModuleRegistry): PlanRegistry {
  console.log('[MCPServerInit] Wiring modules to global PlanRegistry...');

  // Wire AIModule
  const aiModule = moduleRegistry.getModule<AIModule>('AIModule');
  if (aiModule?.aiAssistantPlan) {
    planRegistry.register('aiAssistant', aiModule.aiAssistantPlan as unknown as Plan, {
      description: 'AI assistant operations',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: aiAssistant');
  }

  // Wire MemoryModule
  const memoryModule = moduleRegistry.getModule<MemoryModule>('MemoryModule');
  if (memoryModule?.memoryPlan) {
    planRegistry.register('memory', memoryModule.memoryPlan as unknown as Plan, {
      description: 'Memory/subject storage operations',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: memory');
  }
  if (memoryModule?.chatMemoryPlan) {
    planRegistry.register('chatMemory', memoryModule.chatMemoryPlan as unknown as Plan, {
      description: 'Chat memory integration',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: chatMemory');
  }

  // Wire ChatModule
  const chatModule = moduleRegistry.getModule<ChatModule>('ChatModule');
  if (chatModule?.chatPlan) {
    planRegistry.register('chat', chatModule.chatPlan as unknown as Plan, {
      description: 'Chat operations',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: chat');
  }

  // Wire ConnectionModule
  const connectionModule = moduleRegistry.getModule<ConnectionModule>('ConnectionModule');
  if (connectionModule?.connectionPlan) {
    planRegistry.register('connections', connectionModule.connectionPlan as unknown as Plan, {
      description: 'Connection management',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: connections');
  }

  // Wire CoreModule (contacts via LeuteModel)
  const coreModule = moduleRegistry.getModule<CoreModule>('CoreModule');
  if (coreModule?.leuteModel) {
    planRegistry.register('contacts', coreModule.leuteModel as unknown as Plan, {
      description: 'Contact management',
      version: '1.0.0'
    });
    console.log('[MCPServerInit] Registered: contacts');
  }

  console.log('[MCPServerInit] PlanRegistry wired with', planRegistry.listPlans().length, 'plans');
  return planRegistry;
}

/**
 * Register SubjectMemoryPlan
 * Call after MCPManager.setNodeOneCore() creates the SubjectMemoryPlan instance
 */
export function registerSubjectMemoryPlan(subjectMemoryPlan: any): void {
  if (planRegistry.hasPlan('subjectMemory')) {
    return; // Already registered (idempotent)
  }
  planRegistry.register('subjectMemory', subjectMemoryPlan, {
    description: 'Subject memory tools (memory_context, memory_search, etc.)',
    version: '1.0.0'
  });
  console.log('[MCPServerInit] Registered: subjectMemory');
}

/**
 * Register YouTubePlan
 * Enables YouTube video summarization via MCP tools
 */
export function registerYouTubePlan(youtubePlan: any): void {
  if (planRegistry.hasPlan('youtube')) {
    return; // Already registered (idempotent)
  }
  planRegistry.register('youtube', youtubePlan, {
    description: 'YouTube video summarization using Gemini AI',
    version: '1.0.0'
  });
  console.log('[MCPServerInit] Registered: youtube');
}

/**
 * Start MCP stdio server
 *
 * Call after wireModulesToRegistry()
 */
export async function startMcpServer(): Promise<McpStdioServer> {
  if (mcpServer) {
    console.log('[MCPServerInit] MCP server already running');
    return mcpServer;
  }

  console.log('[MCPServerInit] Starting MCP stdio server...');
  mcpServer = new McpStdioServer(planRegistry, {
    name: 'lama',
    version: '1.0.0'
  });

  await mcpServer.start();
  console.log('[MCPServerInit] ✅ MCP server started');

  return mcpServer;
}

/**
 * Stop MCP server
 */
export async function stopMcpServer(): Promise<void> {
  if (mcpServer) {
    console.log('[MCPServerInit] Stopping MCP server...');
    await mcpServer.stop();
    mcpServer = null;
    console.log('[MCPServerInit] MCP server stopped');
  }
}

/**
 * Get the global PlanRegistry
 */
export function getPlanRegistry(): PlanRegistry {
  return planRegistry;
}
