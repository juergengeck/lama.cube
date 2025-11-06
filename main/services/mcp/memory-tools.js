/**
 * Memory MCP Tools
 * Provides LAMA with access to its own conversation history
 *
 * IMPORTANT: These tools only work for -private models (LAMA)
 * They provide access to the LAMA topic which serves as the AI's memory
 */

export class MemoryTools {
  constructor(nodeOneCore) {
    this.nodeOneCore = nodeOneCore
  }

  /**
   * Get tool definitions for MCP
   */
  getToolDefinitions() {
    return [
      {
        name: 'memory_store',
        description: 'Store a new memory (insight, learning, or important information) to your long-term memory. Use this to remember things across conversations.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The memory content to store - a fact, insight, or important information you want to remember'
            },
            category: {
              type: 'string',
              description: 'Optional category/tag for organizing memories (e.g., "user-preference", "technical-knowledge", "conversation-context")'
            },
            contactEmail: {
              type: 'string',
              description: 'Optional email of contact to set as assembly owner (creates proper ONE.core ownership)'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'memory_search',
        description: 'Search your own conversation history (LAMA topic) for relevant past discussions. Use this to recall what you\'ve learned.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - keywords or concepts to find in your memory'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of messages to return (default: 10)',
              default: 10
            }
          },
          required: ['query']
        }
      },
      {
        name: 'memory_recent',
        description: 'Get your most recent memories (messages from LAMA topic). Use this to recall recent learnings.',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              description: 'Number of recent messages to retrieve (default: 20)',
              default: 20
            }
          }
        }
      },
      {
        name: 'memory_subjects',
        description: 'Get subjects and themes you\'ve learned about across all conversations. Shows what topics you have context for.',
        inputSchema: {
          type: 'object',
          properties: {
            topicId: {
              type: 'string',
              description: 'Optional: Get subjects for a specific topic (default: all topics)'
            }
          }
        }
      },
      {
        name: 'subject_get-messages',
        description: 'Get full message history for a specific subject. Use this when you need complete context about a topic you know exists from the Available Context list.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'The subject name (e.g., "climate-change", "parenting-strategies")'
            },
            limit: {
              type: 'number',
              description: 'Maximum messages to return (default: 50)',
              default: 50
            }
          },
          required: ['subject']
        }
      },
      {
        name: 'subject_search',
        description: 'Search within a specific subject for relevant messages. More focused than memory:search - use when you need specific information within a known subject.',
        inputSchema: {
          type: 'object',
          properties: {
            subject: {
              type: 'string',
              description: 'The subject to search within'
            },
            query: {
              type: 'string',
              description: 'Keywords or concepts to search for within the subject'
            },
            limit: {
              type: 'number',
              description: 'Maximum messages to return (default: 20)',
              default: 20
            }
          },
          required: ['subject', 'query']
        }
      }
    ]
  }

  /**
   * Handle MCP tool call (alias for executeTool)
   */
  async handleToolCall(toolName, params) {
    return await this.executeTool(toolName, params);
  }

  /**
   * Execute a memory tool
   * @param {string} toolName - Name of the tool to execute
   * @param {object} params - Tool parameters
   * @param {object} context - Execution context (topicId, personId, isPrivateModel)
   * @returns {object} MCP-formatted result
   */
  async executeTool(toolName, params, context) {
    // Memory tools are scoped to topics the model participates in
    // Access control is enforced by the topic system itself

    switch (toolName) {
      case 'memory_store':
        return await this.storeMemory(params.content, params.category, params.contactEmail)

      case 'memory_search':
        return await this.searchMemory(params.query, params.limit || 10)

      case 'memory_recent':
        return await this.getRecentMemory(params.count || 20)

      case 'memory_subjects':
        return await this.getSubjects(params.topicId)

      case 'subject_get-messages':
        return await this.getSubjectMessages(params.subject, params.limit || 50)

      case 'subject_search':
        return await this.searchSubject(params.subject, params.query, params.limit || 20)

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown memory tool: ${toolName}`
          }],
          isError: true
        }
    }
  }

  /**
   * Store a new memory as a proper Memory Assembly with Supply/Demand
   * Uses MemoryStorageHandler for complete Assembly.core integration
   */
  async storeMemory(content, category, contactEmail) {
    try {
      console.error(`[MemoryTools] Storing memory (category: ${category || 'general'}, owner: ${contactEmail || 'none'})`)

      // Use MemoryStorageHandler for complete flow:
      // 1. Create Memory object
      // 2. Analyze with LLM
      // 3. Create Supply/Demand
      // 4. Create Assembly
      // 5. Write imploded file
      // 6. Post to journal
      const handler = this.nodeOneCore.memoryStorageHandler
      if (!handler) {
        throw new Error('MemoryStorageHandler not initialized')
      }

      const result = await handler.storeMemory({
        content,
        memoryType: category || 'note',
        category,
        topicRef: 'lama'
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to store memory')
      }

      console.error(`[MemoryTools] Memory Assembly created:`, {
        memoryHash: result.memoryHash,
        assemblyHash: result.assemblyHash,
        filename: result.filename
      })

      return {
        content: [{
          type: 'text',
          text: `Memory Assembly created successfully\nMemory Hash: ${result.memoryHash}\nAssembly Hash: ${result.assemblyHash}\nFilename: ${result.filename}${category ? `\nCategory: ${category}` : ''}\nKeywords: ${result.keywords?.join(', ') || 'none'}\nSubjects: ${result.subjects?.join(', ') || 'none'}\n\nJournal entry created with keywords and subjects`
        }]
      }
    } catch (error) {
      console.error('[MemoryTools] Failed to store memory:', error)
      return {
        content: [{
          type: 'text',
          text: `Failed to store memory: ${error.message}`
        }],
        isError: true
      }
    }
  }

  /**
   * Analyze memory content and create journal entry (keywords, subject, summary)
   */
  async analyzeAndJournalize(topicId, content, category) {
    const topicAnalysisModel = this.nodeOneCore.topicAnalysisModel
    const llmManager = this.nodeOneCore.llmManager

    if (!topicAnalysisModel || !llmManager) {
      console.warn('[MemoryTools] Topic analysis or LLM not available, skipping journalization')
      return
    }

    console.error(`[MemoryTools] Creating journal entry for memory in topic: ${topicId}`)

    // Use LLM to extract keywords, subject, and summary
    const analysisPrompt = [{
      role: 'user',
      content: `Extract keywords, identify the main subject, and create a brief summary for this memory:\n\n"${content}"\n\nCategory: ${category || 'general'}`
    }]

    try {
      // Use chatWithAnalysis to get structured analysis
      const result = await llmManager.chatWithAnalysis(analysisPrompt, undefined, {
        temperature: 0,
        disableTools: true
      })

      console.error(`[MemoryTools] Analysis result:`, {
        hasSubjects: !!result?.analysis?.subjects,
        hasSummary: !!result?.analysis?.summaryUpdate,
        subjectCount: result?.analysis?.subjects?.length || 0
      })

      // Process subjects and keywords
      if (result?.analysis?.subjects && Array.isArray(result.analysis.subjects)) {
        for (const subjectData of result.analysis.subjects) {
          const { name, description, keywords } = subjectData
          const keywordTerms = keywords?.map(k => k.term) || []

          console.error(`[MemoryTools] Creating subject: ${name} with ${keywordTerms.length} keywords`)

          // Create or get subject
          const subject = await topicAnalysisModel.createSubject(
            topicId,
            keywordTerms,
            name,
            description || `Subject identified in ${category || 'general'} category`,
            0.8  // confidence score
          )

          // Add each keyword to subject
          for (const kw of keywords || []) {
            await topicAnalysisModel.addKeywordToSubject(topicId, kw.term, subject.idHash)
          }

          console.error(`[MemoryTools] ✅ Subject created: ${name}`)
        }
      }

      // Update summary
      if (result?.analysis?.summaryUpdate) {
        await topicAnalysisModel.updateSummary(
          topicId,
          result.analysis.summaryUpdate,
          0.8  // confidence score
        )
        console.error(`[MemoryTools] ✅ Summary updated`)
      }

      console.error(`[MemoryTools] ✅ Journal entry complete for topic: ${topicId}`)
    } catch (error) {
      console.error('[MemoryTools] Analysis failed:', error)
      throw error
    }
  }

  /**
   * Search LAMA topic for relevant messages
   */
  async searchMemory(query, limit) {
    try {
      console.error(`[MemoryTools] Searching memory for: "${query}"`)

      // Enter LAMA topic room
      const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom('lama')
      const allMessages = await topicRoom.retrieveAllMessages()

      // Simple keyword search (could be enhanced with semantic search later)
      const queryLower = query.toLowerCase()
      const matches = allMessages
        .filter(msg => {
          const text = msg.data?.text || msg.text || ''
          return text.toLowerCase().includes(queryLower)
        })
        .slice(-limit) // Most recent matches

      if (matches.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No memories found matching "${query}"`
          }]
        }
      }

      // Format results
      const results = matches.map((msg, idx) => {
        const text = msg.data?.text || msg.text || ''
        const timestamp = msg.data?.timestamp || msg.timestamp || 'unknown'
        return `[${idx + 1}] ${timestamp}\n${text}\n`
      }).join('\n---\n\n')

      return {
        content: [{
          type: 'text',
          text: `Found ${matches.length} relevant memories:\n\n${results}`
        }]
      }
    } catch (error) {
      console.error('[MemoryTools] Search failed:', error)
      return {
        content: [{
          type: 'text',
          text: `Memory search failed: ${error.message}`
        }],
        isError: true
      }
    }
  }

  /**
   * Get recent messages from LAMA topic
   */
  async getRecentMemory(count) {
    try {
      console.error(`[MemoryTools] Getting ${count} recent memories`)

      const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom('lama')
      const allMessages = await topicRoom.retrieveAllMessages()

      // Get most recent messages
      const recent = allMessages.slice(-count)

      if (recent.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No memories yet - this is the beginning of your memory.'
          }]
        }
      }

      // Format results
      const results = recent.map((msg, idx) => {
        const text = msg.data?.text || msg.text || ''
        const timestamp = msg.data?.timestamp || msg.timestamp || 'unknown'
        const sender = msg.data?.sender || msg.author
        const isUser = !this.nodeOneCore.aiAssistantModel?.isAIPerson(sender)
        const role = isUser ? 'User' : 'You'

        return `[${idx + 1}] ${timestamp} - ${role}:\n${text}\n`
      }).join('\n---\n\n')

      return {
        content: [{
          type: 'text',
          text: `Your ${recent.length} most recent memories:\n\n${results}`
        }]
      }
    } catch (error) {
      console.error('[MemoryTools] Recent memory retrieval failed:', error)
      return {
        content: [{
          type: 'text',
          text: `Failed to retrieve recent memories: ${error.message}`
        }],
        isError: true
      }
    }
  }

  /**
   * Get subjects/themes from topic analysis
   */
  async getSubjects(topicId) {
    try {
      const topicAnalysisModel = this.nodeOneCore.topicAnalysisModel

      if (!topicAnalysisModel) {
        return {
          content: [{
            type: 'text',
            text: 'Topic analysis not available - cannot retrieve subjects'
          }],
          isError: true
        }
      }

      let subjects
      if (topicId) {
        console.error(`[MemoryTools] Getting subjects for topic: ${topicId}`)
        subjects = await topicAnalysisModel.getSubjects(topicId)
      } else {
        console.error(`[MemoryTools] Getting all subjects across conversations`)
        // Get all topics and aggregate subjects
        const allChannels = await this.nodeOneCore.channelManager.getMatchingChannelInfos()
        const allSubjects = []

        for (const channel of allChannels) {
          try {
            const topicSubjects = await topicAnalysisModel.getSubjects(channel.id)
            allSubjects.push(...topicSubjects)
          } catch (e) {
            // Skip topics without subjects
          }
        }

        subjects = allSubjects
      }

      if (!subjects || subjects.length === 0) {
        return {
          content: [{
            type: 'text',
            text: topicId
              ? `No subjects found for topic ${topicId}`
              : 'No subjects learned yet across any conversations'
          }]
        }
      }

      // Format subjects with their keywords
      const activeSubjects = subjects.filter(s => !s.archived)
      const formatted = activeSubjects.map((subject, idx) => {
        const keywords = subject.keywords?.join(', ') || 'no keywords'
        const desc = subject.description || 'no description'
        return `[${idx + 1}] ${subject.keywordCombination || subject.name}\n   Keywords: ${keywords}\n   ${desc}`
      }).join('\n\n')

      return {
        content: [{
          type: 'text',
          text: `You have context for ${activeSubjects.length} subjects:\n\n${formatted}`
        }]
      }
    } catch (error) {
      console.error('[MemoryTools] Subject retrieval failed:', error)
      return {
        content: [{
          type: 'text',
          text: `Failed to retrieve subjects: ${error.message}`
        }],
        isError: true
      }
    }
  }

  /**
   * Get full message history for a specific subject
   * This retrieves all messages related to a subject across all conversations
   */
  async getSubjectMessages(subjectName, limit = 50) {
    try {
      console.error(`[MemoryTools] Getting messages for subject: "${subjectName}"`)

      const topicAnalysisModel = this.nodeOneCore.topicAnalysisModel

      if (!topicAnalysisModel) {
        return {
          content: [{
            type: 'text',
            text: 'Topic analysis not available - cannot retrieve subject messages'
          }],
          isError: true
        }
      }

      // Find subject by name across all topics
      const allChannels = await this.nodeOneCore.channelManager.getMatchingChannelInfos()
      let targetSubject = null
      let targetTopicId = null

      for (const channel of allChannels) {
        try {
          const subjects = await topicAnalysisModel.getSubjects(channel.id)
          const found = subjects.find(s =>
            (s.name === subjectName || s.keywordCombination === subjectName) && !s.archived
          )
          if (found) {
            targetSubject = found
            targetTopicId = channel.id
            break
          }
        } catch (e) {
          // Skip topics without subjects
        }
      }

      if (!targetSubject) {
        return {
          content: [{
            type: 'text',
            text: `Subject "${subjectName}" not found in any conversation`
          }]
        }
      }

      // Get messages from that topic
      const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom(targetTopicId)
      const allMessages = await topicRoom.retrieveAllMessages()

      // Filter to messages relevant to this subject (by keyword matching)
      const keywords = targetSubject.keywords || []
      const relevantMessages = allMessages
        .filter(msg => {
          const text = (msg.data?.text || msg.text || '').toLowerCase()
          // Message is relevant if it contains any of the subject's keywords
          return keywords.some(kw => text.includes(kw.toLowerCase()))
        })
        .slice(-limit) // Get last N messages

      if (relevantMessages.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No messages found for subject "${subjectName}"`
          }]
        }
      }

      // Format messages
      const formatted = relevantMessages.map((msg, idx) => {
        const text = msg.data?.text || msg.text || ''
        const timestamp = msg.data?.timestamp || msg.timestamp
        const timeStr = timestamp ? new Date(timestamp).toLocaleString() : 'unknown'
        const sender = msg.data?.sender || msg.author
        const isAI = this.nodeOneCore.aiAssistantModel?.isAIPerson(sender)
        const role = isAI ? 'Assistant' : 'User'

        return `[${idx + 1}] ${timeStr} - ${role}:\n${text}`
      }).join('\n\n---\n\n')

      return {
        content: [{
          type: 'text',
          text: `Messages for subject "${subjectName}" (${relevantMessages.length} found, showing last ${limit}):\n\n${formatted}`
        }]
      }
    } catch (error) {
      console.error('[MemoryTools] Subject messages retrieval failed:', error)
      return {
        content: [{
          type: 'text',
          text: `Failed to retrieve messages: ${error.message}`
        }],
        isError: true
      }
    }
  }

  /**
   * Search within a specific subject for relevant messages
   * More focused than general memory search
   */
  async searchSubject(subjectName, query, limit = 20) {
    try {
      console.error(`[MemoryTools] Searching subject "${subjectName}" for: "${query}"`)

      const topicAnalysisModel = this.nodeOneCore.topicAnalysisModel

      if (!topicAnalysisModel) {
        return {
          content: [{
            type: 'text',
            text: 'Topic analysis not available - cannot search subjects'
          }],
          isError: true
        }
      }

      // Find subject by name across all topics
      const allChannels = await this.nodeOneCore.channelManager.getMatchingChannelInfos()
      let targetSubject = null
      let targetTopicId = null

      for (const channel of allChannels) {
        try {
          const subjects = await topicAnalysisModel.getSubjects(channel.id)
          const found = subjects.find(s =>
            (s.name === subjectName || s.keywordCombination === subjectName) && !s.archived
          )
          if (found) {
            targetSubject = found
            targetTopicId = channel.id
            break
          }
        } catch (e) {
          // Skip topics without subjects
        }
      }

      if (!targetSubject) {
        return {
          content: [{
            type: 'text',
            text: `Subject "${subjectName}" not found in any conversation`
          }]
        }
      }

      // Get messages from that topic
      const topicRoom = await this.nodeOneCore.topicModel.enterTopicRoom(targetTopicId)
      const allMessages = await topicRoom.retrieveAllMessages()

      // Filter by subject keywords first, then by query
      const keywords = targetSubject.keywords || []
      const queryLower = query.toLowerCase()

      const relevantMessages = allMessages
        .filter(msg => {
          const text = (msg.data?.text || msg.text || '').toLowerCase()
          // Must match subject keywords AND search query
          const matchesSubject = keywords.some(kw => text.includes(kw.toLowerCase()))
          const matchesQuery = text.includes(queryLower)
          return matchesSubject && matchesQuery
        })
        .slice(-limit) // Get last N matches

      if (relevantMessages.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No messages found in subject "${subjectName}" matching "${query}"`
          }]
        }
      }

      // Format messages
      const formatted = relevantMessages.map((msg, idx) => {
        const text = msg.data?.text || msg.text || ''
        const timestamp = msg.data?.timestamp || msg.timestamp
        const timeStr = timestamp ? new Date(timestamp).toLocaleString() : 'unknown'
        const sender = msg.data?.sender || msg.author
        const isAI = this.nodeOneCore.aiAssistantModel?.isAIPerson(sender)
        const role = isAI ? 'Assistant' : 'User'

        return `[${idx + 1}] ${timeStr} - ${role}:\n${text}`
      }).join('\n\n---\n\n')

      return {
        content: [{
          type: 'text',
          text: `Search results in subject "${subjectName}" for "${query}" (${relevantMessages.length} found):\n\n${formatted}`
        }]
      }
    } catch (error) {
      console.error('[MemoryTools] Subject search failed:', error)
      return {
        content: [{
          type: 'text',
          text: `Failed to search subject: ${error.message}`
        }],
        isError: true
      }
    }
  }
}

export default MemoryTools
