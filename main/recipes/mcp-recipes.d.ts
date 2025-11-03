/**
 * TypeScript type definitions for MCP recipes
 */

import type { SHA256IdHash } from '@refinio/one.core/lib/util/type-checks.js';

export interface MCPServer {
  $type$: 'MCPServer';
  name: string;
  command: string;
  args: string[];
  description: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MCPServerConfig {
  $type$: 'MCPServerConfig';
  userEmail: string;
  servers: SHA256IdHash<MCPServer>[];
  updatedAt: number;
}

export interface MCPTopicConfig {
  $type$: 'MCPTopicConfig';
  topicId: string;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  allowedTools?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MCPToolCall {
  $type$: 'MCPToolCall';
  id: string;
  toolName: string;
  parameters: string;  // JSON-serialized
  result?: string;     // JSON-serialized
  error?: string;
  timestamp: number;
  duration?: number;
  topicId: string;
  messageHash?: string;
}

// Extend ONE's type system
declare module '@OneObjectInterfaces' {
  export interface OneVersionedObjectInterfaces {
    MCPServer: MCPServer;
    MCPServerConfig: MCPServerConfig;
    MCPTopicConfig: MCPTopicConfig;
    MCPToolCall: MCPToolCall;
  }
}
