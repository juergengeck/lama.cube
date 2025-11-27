/**
 * IPC handler for knowledge graph data
 * Aggregates subjects, memories, documents, topics and computes edges
 */

import type { IpcMainInvokeEvent } from 'electron';

interface GraphNode {
  id: string;
  type: 'subject' | 'memory' | 'document' | 'topic';
  label: string;
  keywords: string[];
  metadata?: {
    createdAt?: number;
    messageCount?: number;
    topicId?: string;
  };
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  keywords: string[];
}

export default function registerKnowledgeGraphHandlers(ipcMain: any, nodeOneCore: any) {
  /**
   * Get knowledge graph data (nodes + edges)
   */
  ipcMain.handle('memory:getKnowledgeGraph', async (event: IpcMainInvokeEvent) => {
    try {
      if (!nodeOneCore?.topicAnalysisModel) {
        throw new Error('TopicAnalysisModel not initialized');
      }

      const nodes: GraphNode[] = [];
      const keywordToNodes = new Map<string, string[]>(); // keyword -> node ids

      // Get all topics
      const topics = await nodeOneCore.topicAnalysisModel.getAllTopics();

      for (const topicId of topics) {
        // Add topic as node
        const topicNode: GraphNode = {
          id: `topic:${topicId}`,
          type: 'topic',
          label: topicId.length > 20 ? topicId.substring(0, 20) + '...' : topicId,
          keywords: [],
          metadata: { topicId }
        };

        // Get subjects for this topic
        const subjects = await nodeOneCore.topicAnalysisModel.getSubjects(topicId);

        // Get keywords ONCE per topic (not per subject)
        const keywords = await nodeOneCore.topicAnalysisModel.getKeywords(topicId);
        const topicKeywords: string[] = [];

        for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
          const subject = subjects[subjectIndex];

          // Generate stable node ID ONCE
          const nodeId = `subject:${topicId}:${subjectIndex}`;
          const keywordTerms: string[] = [];

          for (const kw of keywords) {
            if (kw.term) {
              keywordTerms.push(kw.term);
              topicKeywords.push(kw.term);

              // Track which nodes have this keyword
              if (!keywordToNodes.has(kw.term)) {
                keywordToNodes.set(kw.term, []);
              }
              keywordToNodes.get(kw.term)!.push(nodeId);
            }
          }

          // Add subject as node
          nodes.push({
            id: nodeId,
            type: 'subject',
            label: subject.description || 'Untitled Subject',
            keywords: keywordTerms,
            metadata: {
              createdAt: subject.createdAt,
              messageCount: subject.messageCount,
              topicId
            }
          });
        }

        // Update topic node with aggregated keywords
        topicNode.keywords = [...new Set(topicKeywords)];
        nodes.push(topicNode);

        // Track topic keywords for edges
        for (const kw of topicNode.keywords) {
          if (!keywordToNodes.has(kw)) {
            keywordToNodes.set(kw, []);
          }
          keywordToNodes.get(kw)!.push(topicNode.id);
        }
      }

      // Compute edges based on shared keywords
      const edges: GraphEdge[] = [];
      const edgeSet = new Set<string>(); // prevent duplicates

      for (const [keyword, nodeIds] of keywordToNodes) {
        // Connect all nodes that share this keyword
        for (let i = 0; i < nodeIds.length; i++) {
          for (let j = i + 1; j < nodeIds.length; j++) {
            const edgeKey = [nodeIds[i], nodeIds[j]].sort().join('|');

            if (!edgeSet.has(edgeKey)) {
              edgeSet.add(edgeKey);

              // Find all shared keywords between these nodes
              const node1 = nodes.find(n => n.id === nodeIds[i]);
              const node2 = nodes.find(n => n.id === nodeIds[j]);

              if (node1 && node2) {
                const sharedKeywords = node1.keywords.filter(k => node2.keywords.includes(k));

                edges.push({
                  source: nodeIds[i],
                  target: nodeIds[j],
                  weight: sharedKeywords.length,
                  keywords: sharedKeywords
                });
              }
            }
          }
        }
      }

      console.log(`[KnowledgeGraph] Built graph with ${nodes.length} nodes, ${edges.length} edges`);

      return { success: true, data: { nodes, edges } };
    } catch (error) {
      console.error('[IPC:memory:getKnowledgeGraph] Error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  console.log('[IPC] Knowledge graph handlers registered');
}
