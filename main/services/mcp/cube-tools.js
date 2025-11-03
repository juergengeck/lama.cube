/**
 * Cube MCP Tools
 * Provides access to CubeStorage and Assembly system operations
 *
 * Exposes cube.core handlers as MCP tools for:
 * - Assembly creation and management
 * - Plan storage and retrieval
 * - Supply/Demand tracking
 * - Story (audit trail) generation
 */

export class CubeTools {
  constructor(nodeOneCore) {
    this.nodeOneCore = nodeOneCore
    this.cubeManager = null
  }

  /**
   * Initialize with CubeManager instance
   */
  async init() {
    // CubeManager is initialized in NodeOneCore
    // Access it through nodeOneCore.cubeManager
    this.cubeManager = this.nodeOneCore.cubeManager

    if (!this.cubeManager) {
      console.warn('[CubeTools] CubeManager not available')
    }
  }

  /**
   * Get tool definitions for MCP
   */
  getToolDefinitions() {
    return [
      {
        name: 'cube:createSupply',
        description: 'Create a Supply (capability/resource) in the Assembly system',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Supply name/identifier'
            },
            description: {
              type: 'string',
              description: 'Description of what this supply provides'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata as key-value pairs',
              additionalProperties: true
            }
          },
          required: ['name']
        }
      },
      {
        name: 'cube:createDemand',
        description: 'Create a Demand (requirement/need) in the Assembly system',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Demand name/identifier'
            },
            description: {
              type: 'string',
              description: 'Description of what is needed'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata as key-value pairs',
              additionalProperties: true
            }
          },
          required: ['name']
        }
      },
      {
        name: 'cube:createAssembly',
        description: 'Create an Assembly (matches Supply to Demand) in the Assembly system',
        inputSchema: {
          type: 'object',
          properties: {
            supplyIdHash: {
              type: 'string',
              description: 'ID hash of the Supply being assembled'
            },
            demandIdHash: {
              type: 'string',
              description: 'ID hash of the Demand being fulfilled'
            },
            name: {
              type: 'string',
              description: 'Assembly name/identifier'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata as key-value pairs',
              additionalProperties: true
            }
          },
          required: ['supplyIdHash', 'demandIdHash']
        }
      },
      {
        name: 'cube:createPlan',
        description: 'Create a Plan (learned pattern from Assemblies)',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Plan name/identifier'
            },
            description: {
              type: 'string',
              description: 'Description of the plan pattern'
            },
            assemblyIdHashes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of Assembly ID hashes that form this plan'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata as key-value pairs',
              additionalProperties: true
            }
          },
          required: ['name']
        }
      },
      {
        name: 'cube:createStory',
        description: 'Create a Story (audit trail/narrative) for an Assembly or Plan',
        inputSchema: {
          type: 'object',
          properties: {
            assemblyIdHash: {
              type: 'string',
              description: 'ID hash of the Assembly this story is about'
            },
            narrative: {
              type: 'string',
              description: 'The story/narrative text'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata as key-value pairs',
              additionalProperties: true
            }
          },
          required: ['assemblyIdHash', 'narrative']
        }
      },
      {
        name: 'cube:queryAssemblies',
        description: 'Query Assemblies from the Cube storage',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'Query filter (dimensional metadata)',
              additionalProperties: true
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
              default: 10
            }
          }
        }
      },
      {
        name: 'cube:queryPlans',
        description: 'Query Plans from the Cube storage',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'Query filter (dimensional metadata)',
              additionalProperties: true
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
              default: 10
            }
          }
        }
      },
      {
        name: 'cube:getAssembly',
        description: 'Get a specific Assembly by ID hash',
        inputSchema: {
          type: 'object',
          properties: {
            idHash: {
              type: 'string',
              description: 'ID hash of the Assembly'
            }
          },
          required: ['idHash']
        }
      },
      {
        name: 'cube:getPlan',
        description: 'Get a specific Plan by ID hash',
        inputSchema: {
          type: 'object',
          properties: {
            idHash: {
              type: 'string',
              description: 'ID hash of the Plan'
            }
          },
          required: ['idHash']
        }
      }
    ]
  }

  /**
   * Execute a cube tool
   * @param {string} toolName - Name of the tool to execute
   * @param {object} params - Tool parameters
   * @param {object} context - Execution context (topicId, personId)
   * @returns {object} MCP-formatted result
   */
  async executeTool(toolName, params, context) {
    if (!this.cubeManager) {
      return {
        content: [{
          type: 'text',
          text: 'CubeManager not initialized - cube tools unavailable'
        }],
        isError: true
      }
    }

    try {
      switch (toolName) {
        case 'cube:createSupply':
          return await this.createSupply(params)

        case 'cube:createDemand':
          return await this.createDemand(params)

        case 'cube:createAssembly':
          return await this.createAssembly(params)

        case 'cube:createPlan':
          return await this.createPlan(params)

        case 'cube:createStory':
          return await this.createStory(params)

        case 'cube:queryAssemblies':
          return await this.queryAssemblies(params)

        case 'cube:queryPlans':
          return await this.queryPlans(params)

        case 'cube:getAssembly':
          return await this.getAssembly(params)

        case 'cube:getPlan':
          return await this.getPlan(params)

        default:
          return {
            content: [{
              type: 'text',
              text: `Unknown cube tool: ${toolName}`
            }],
            isError: true
          }
      }
    } catch (error) {
      console.error(`[CubeTools] Error executing ${toolName}:`, error)
      return {
        content: [{
          type: 'text',
          text: `Failed to execute ${toolName}: ${error.message}`
        }],
        isError: true
      }
    }
  }

  /**
   * Create a Supply
   */
  async createSupply(params) {
    console.log('[CubeTools] Creating Supply:', params.name)

    const result = await this.cubeManager.createSupply({
      name: params.name,
      description: params.description || '',
      metadata: params.metadata ? new Map(Object.entries(params.metadata)) : new Map()
    })

    return {
      content: [{
        type: 'text',
        text: `✅ Created Supply: ${params.name}\nID Hash: ${result.supply.idHash}\nHash: ${result.supply.hash}`
      }]
    }
  }

  /**
   * Create a Demand
   */
  async createDemand(params) {
    console.log('[CubeTools] Creating Demand:', params.name)

    const result = await this.cubeManager.createDemand({
      name: params.name,
      description: params.description || '',
      metadata: params.metadata ? new Map(Object.entries(params.metadata)) : new Map()
    })

    return {
      content: [{
        type: 'text',
        text: `✅ Created Demand: ${params.name}\nID Hash: ${result.demand.idHash}\nHash: ${result.demand.hash}`
      }]
    }
  }

  /**
   * Create an Assembly
   */
  async createAssembly(params) {
    console.log('[CubeTools] Creating Assembly:', params.name || 'unnamed')

    const result = await this.cubeManager.createAssembly({
      supply: params.supplyIdHash,
      demand: params.demandIdHash,
      name: params.name,
      metadata: params.metadata ? new Map(Object.entries(params.metadata)) : new Map()
    })

    return {
      content: [{
        type: 'text',
        text: `✅ Created Assembly\nID Hash: ${result.assembly.idHash}\nHash: ${result.assembly.hash}\nSupply: ${params.supplyIdHash}\nDemand: ${params.demandIdHash}`
      }]
    }
  }

  /**
   * Create a Plan
   */
  async createPlan(params) {
    console.log('[CubeTools] Creating Plan:', params.name)

    const result = await this.cubeManager.createPlan({
      name: params.name,
      description: params.description || '',
      assemblies: params.assemblyIdHashes || [],
      metadata: params.metadata ? new Map(Object.entries(params.metadata)) : new Map()
    })

    return {
      content: [{
        type: 'text',
        text: `✅ Created Plan: ${params.name}\nID Hash: ${result.plan.idHash}\nHash: ${result.plan.hash}\nAssemblies: ${params.assemblyIdHashes?.length || 0}`
      }]
    }
  }

  /**
   * Create a Story
   */
  async createStory(params) {
    console.log('[CubeTools] Creating Story for Assembly:', params.assemblyIdHash)

    const result = await this.cubeManager.createStory({
      assembly: params.assemblyIdHash,
      narrative: params.narrative,
      metadata: params.metadata ? new Map(Object.entries(params.metadata)) : new Map()
    })

    return {
      content: [{
        type: 'text',
        text: `✅ Created Story\nID Hash: ${result.story.idHash}\nHash: ${result.story.hash}\nFor Assembly: ${params.assemblyIdHash}`
      }]
    }
  }

  /**
   * Query Assemblies
   */
  async queryAssemblies(params) {
    console.log('[CubeTools] Querying Assemblies')

    const results = await this.cubeManager.queryAssemblies(params.filter || {})
    const limited = results.slice(0, params.limit || 10)

    if (limited.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No Assemblies found matching query'
        }]
      }
    }

    const formatted = limited.map((assembly, idx) => {
      return `[${idx + 1}] ${assembly.name || 'unnamed'}\n   ID Hash: ${assembly.idHash}\n   Supply: ${assembly.supply}\n   Demand: ${assembly.demand}`
    }).join('\n\n')

    return {
      content: [{
        type: 'text',
        text: `Found ${limited.length} Assemblies:\n\n${formatted}`
      }]
    }
  }

  /**
   * Query Plans
   */
  async queryPlans(params) {
    console.log('[CubeTools] Querying Plans')

    const results = await this.cubeManager.queryPlans(params.filter || {})
    const limited = results.slice(0, params.limit || 10)

    if (limited.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No Plans found matching query'
        }]
      }
    }

    const formatted = limited.map((plan, idx) => {
      return `[${idx + 1}] ${plan.name}\n   ID Hash: ${plan.idHash}\n   Description: ${plan.description || 'none'}\n   Assemblies: ${plan.assemblies?.length || 0}`
    }).join('\n\n')

    return {
      content: [{
        type: 'text',
        text: `Found ${limited.length} Plans:\n\n${formatted}`
      }]
    }
  }

  /**
   * Get specific Assembly
   */
  async getAssembly(params) {
    console.log('[CubeTools] Getting Assembly:', params.idHash)

    const assembly = await this.cubeManager.getAssembly(params.idHash)

    return {
      content: [{
        type: 'text',
        text: `Assembly: ${assembly.name || 'unnamed'}\nID Hash: ${assembly.idHash}\nHash: ${assembly.hash}\nSupply: ${assembly.supply}\nDemand: ${assembly.demand}\nChildren: ${assembly.children?.length || 0}\nMetadata: ${JSON.stringify(Object.fromEntries(assembly.metadata || new Map()), null, 2)}`
      }]
    }
  }

  /**
   * Get specific Plan
   */
  async getPlan(params) {
    console.log('[CubeTools] Getting Plan:', params.idHash)

    const plan = await this.cubeManager.getPlan(params.idHash)

    return {
      content: [{
        type: 'text',
        text: `Plan: ${plan.name}\nID Hash: ${plan.idHash}\nHash: ${plan.hash}\nDescription: ${plan.description || 'none'}\nAssemblies: ${plan.assemblies?.length || 0}\nMetadata: ${JSON.stringify(Object.fromEntries(plan.metadata || new Map()), null, 2)}`
      }]
    }
  }
}

export default CubeTools
