/**
 * MCP Server Configuration Recipes
 * Stores MCP server configurations as versioned ONE.core objects
 */

/**
 * MCPServer - Configuration for an MCP server
 * Versioned object with name as ID property
 */
export const MCPServerRecipe = {
  $type$: 'Recipe',
  name: 'MCPServer',
  rule: [
    {
      itemprop: 'name',
      isId: true,  // Name is the unique identifier
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'command',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'args',
      itemtype: {
        type: 'array',
        item: {
          type: 'string'
          // No rules needed for primitive types
        }
      }
    },
    {
      itemprop: 'description',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'enabled',
      itemtype: { type: 'boolean' }
    },
    {
      itemprop: 'createdAt',
      itemtype: { type: 'number' }
    },
    {
      itemprop: 'updatedAt',
      itemtype: { type: 'number' }
    }
  ]
};

/**
 * MCPServerConfig - User's MCP configuration object
 * Stores references to all configured MCP servers
 * Versioned object with userEmail as ID
 */
export const MCPServerConfigRecipe = {
  $type$: 'Recipe',
  name: 'MCPServerConfig',
  rule: [
    {
      itemprop: 'userEmail',
      isId: true,  // User email is the unique identifier
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'servers',
      itemtype: {
        type: 'bag',
        item: {
          type: 'referenceToId',
          allowedTypes: new Set(['MCPServer'])
          // No rules needed for reference types
        }
      }
    },
    {
      itemprop: 'updatedAt',
      itemtype: { type: 'number' }
    }
  ]
};

/**
 * MCPTopicConfig - Per-topic MCP configuration
 * Controls inbound/outbound MCP for each conversation
 * Versioned object with topicId as ID
 */
export const MCPTopicConfigRecipe = {
  $type$: 'Recipe',
  name: 'MCPTopicConfig',
  rule: [
    {
      itemprop: 'topicId',
      isId: true,  // Topic ID is the unique identifier
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'inboundEnabled',
      itemtype: { type: 'boolean' }
    },
    {
      itemprop: 'outboundEnabled',
      itemtype: { type: 'boolean' }
    },
    {
      itemprop: 'allowedTools',
      itemtype: {
        type: 'bag',
        item: {
          type: 'string'
        }
      },
      optional: true
    },
    {
      itemprop: 'createdAt',
      itemtype: { type: 'number' }
    },
    {
      itemprop: 'updatedAt',
      itemtype: { type: 'number' }
    }
  ]
};

/**
 * MCPToolCall - Record of an MCP tool invocation
 * Stored as message attachment for auditability
 */
export const MCPToolCallRecipe = {
  $type$: 'Recipe',
  name: 'MCPToolCall',
  rule: [
    {
      itemprop: 'id',
      isId: true,  // Unique call ID
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'toolName',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'parameters',
      itemtype: { type: 'string' }  // JSON-serialized parameters
    },
    {
      itemprop: 'result',
      itemtype: { type: 'string' },  // JSON-serialized result
      optional: true
    },
    {
      itemprop: 'error',
      itemtype: { type: 'string' },
      optional: true
    },
    {
      itemprop: 'timestamp',
      itemtype: { type: 'number' }
    },
    {
      itemprop: 'duration',
      itemtype: { type: 'number' },  // Execution time in milliseconds
      optional: true
    },
    {
      itemprop: 'topicId',
      itemtype: { type: 'string' }
    },
    {
      itemprop: 'messageHash',
      itemtype: { type: 'string' },  // Hash of the message this call is attached to
      optional: true
    }
  ]
};

export const MCPRecipes = [
  MCPServerRecipe,
  MCPServerConfigRecipe,
  MCPTopicConfigRecipe,
  MCPToolCallRecipe
];
