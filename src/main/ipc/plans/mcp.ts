/**
 * MCP IPC Plans
 *
 * Thin IPC bridge — delegates all business logic to @refinio/mcp.core/plans.
 * Only wires Electron IPC events to MCPPlans and injects cube-specific deps.
 */

import type { IpcMainInvokeEvent } from 'electron';
import { MCPPlans, type MCPServerLifecycle } from '@refinio/mcp.core/plans';
import { getPlanRegistry, stopMcpServer, startMcpServer } from '../../services/mcp-server-init.js';
import { lamaAPIServer } from '../../services/lama-api-server.js';

// ── Singleton ──────────────────────────────────────────────────────────

const lifecycle: MCPServerLifecycle = {
  getPlanRegistry: () => getPlanRegistry(),
  getApiServerRunning: () => lamaAPIServer.getStatus().running,
  startMcpServer,
  stopMcpServer,
  startApiServer: () => lamaAPIServer.start(),
  stopApiServer: () => lamaAPIServer.stop()
};

const plans = new MCPPlans(lifecycle);

/**
 * Reset all MCP state. Called on node re-init.
 */
export function resetMCPPlans(): void {
  plans.reset();
}

/**
 * Re-export for callers that need to init supply/demand.
 */
export { plans as mcpPlansInstance };

// ── IPC plan map ───────────────────────────────────────────────────────

const mcpPlans = {
  async listServers(_event: IpcMainInvokeEvent) {
    const servers = await plans.listServers();
    return { success: true, servers };
  },

  async addServer(_event: IpcMainInvokeEvent, request: { config: any }) {
    await plans.addServer(request.config);
    return { success: true };
  },

  async updateServer(_event: IpcMainInvokeEvent, request: { name: string; config: any }) {
    await plans.updateServer(request.name, request.config);
    return { success: true };
  },

  async removeServer(_event: IpcMainInvokeEvent, request: { name: string }) {
    await plans.removeServer(request.name);
    return { success: true };
  },

  async getAvailableTools(_event: IpcMainInvokeEvent) {
    const tools = plans.getAvailableTools();
    return { success: true, tools };
  },

  async getStatus(_event: IpcMainInvokeEvent) {
    const data = plans.getStatus();
    return { success: true, data };
  },

  async reconnect(_event: IpcMainInvokeEvent) {
    await plans.reconnect();
    return { success: true };
  },

  async toggle(_event: IpcMainInvokeEvent, request: { enabled: boolean }) {
    await plans.toggle(request.enabled);
    return { success: true };
  },

  async getTopicConfig(_event: IpcMainInvokeEvent, request: { topicId: string }) {
    const config = await plans.getTopicConfig(request.topicId);
    return { success: true, config };
  },

  async setTopicConfig(_event: IpcMainInvokeEvent, request: { topicId: string; config: any }) {
    await plans.setTopicConfig(request.topicId, request.config);
    return { success: true };
  },

  // Supply / demand

  async createSupply(_event: IpcMainInvokeEvent, request: { topicId: string; allowedTools?: string[] }) {
    await plans.createSupply(request.topicId, request.allowedTools);
    return { success: true };
  },

  async removeSupply(_event: IpcMainInvokeEvent, request: { topicId: string }) {
    await plans.removeSupply(request.topicId);
    return { success: true };
  },

  async hasSupply(_event: IpcMainInvokeEvent, request: { topicId: string }) {
    const hasSupply = plans.hasSupply(request.topicId);
    return { success: true, hasSupply };
  },

  async getSupply(_event: IpcMainInvokeEvent, request: { topicId: string }) {
    const supply = plans.getSupply(request.topicId);
    return { success: true, supply };
  },

  async handleDemand(_event: IpcMainInvokeEvent, request: { topicId: string; requesterPersonId: string }) {
    await plans.handleDemand(request.topicId, request.requesterPersonId);
    return { success: true };
  },

  async handleRequest(_event: IpcMainInvokeEvent, request: { requestData: any; senderPersonId: string; topicId: string }) {
    await plans.handleRequest(request.requestData, request.senderPersonId, request.topicId);
    return { success: true };
  },

  async hasValidCredential(_event: IpcMainInvokeEvent, request: { topicId: string; consumerPersonId: string }) {
    const hasCredential = plans.hasValidCredential(request.topicId, request.consumerPersonId);
    return { success: true, hasCredential };
  },

  async revokeCredential(_event: IpcMainInvokeEvent, request: { topicId: string; consumerPersonId: string }) {
    await plans.revokeCredential(request.topicId, request.consumerPersonId);
    return { success: true };
  }
};

export default mcpPlans;
