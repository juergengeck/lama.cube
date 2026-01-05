/**
 * IPC handler for knowledge graph data
 * Aggregates subjects, memories, documents, topics and computes edges
 *
 * ABSTRACTION HIERARCHY:
 * - Nodes have embeddings for semantic positioning (X/Z plane)
 * - Parent/child relationships computed via embedding centroids
 * - Abstraction level = tree depth (leaves=0, root=max)
 * - Edge types: 'hierarchy' (parent→child) or 'semantic' (keyword overlap)
 */

import type { IpcMainInvokeEvent } from 'electron';
import { getInferenceManager } from '../../core/inference-manager.js';
import { cosineSimilarity } from '@cube/meaning.core';

interface GraphNode {
  id: string;
  type: 'subject' | 'memory' | 'document' | 'topic';
  label: string;
  keywords: string[];
  // Abstraction hierarchy
  abstractionLevel?: number;
  parent?: string;
  children?: string[];
  // Embedding for semantic positioning
  embedding?: number[];
  embeddingModel?: string;
  metadata?: {
    createdAt?: number;
    messageCount?: number;
    topicId?: string;
  };
}

type GraphEdgeType = 'semantic' | 'hierarchy';

interface GraphEdge {
  source: string;
  target: string;
  type: GraphEdgeType;
  weight: number;
  keywords?: string[];
}

/**
 * Compute centroid (mean) of a set of embeddings
 */
function computeCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dims = embeddings[0].length;
  const centroid = new Array(dims).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += emb[i];
    }
  }

  for (let i = 0; i < dims; i++) {
    centroid[i] /= embeddings.length;
  }

  return centroid;
}

/**
 * Build abstraction hierarchy using embedding centroids
 *
 * Algorithm:
 * 1. Start with all nodes as potential leaves
 * 2. Repeatedly find clusters of similar nodes
 * 3. Create parent nodes at centroid of each cluster
 * 4. Continue until a single root remains
 *
 * Returns nodes with parent/children set and abstraction levels computed
 */
function buildAbstractionHierarchy(
  nodes: GraphNode[],
  similarityThreshold: number = 0.7
): { nodes: GraphNode[]; hierarchyEdges: GraphEdge[] } {
  // Only process nodes with embeddings
  const nodesWithEmbeddings = nodes.filter(n => n.embedding && n.embedding.length > 0);
  const nodesWithoutEmbeddings = nodes.filter(n => !n.embedding || n.embedding.length === 0);

  if (nodesWithEmbeddings.length < 2) {
    // Not enough nodes for hierarchy - just set level 0
    for (const node of nodes) {
      node.abstractionLevel = 0;
    }
    return { nodes, hierarchyEdges: [] };
  }

  const hierarchyEdges: GraphEdge[] = [];
  let currentLevel = [...nodesWithEmbeddings];
  let level = 0;
  const allNodes = [...nodes];

  // Set leaf nodes to level 0
  for (const node of currentLevel) {
    node.abstractionLevel = 0;
    node.children = [];
  }

  // Build hierarchy bottom-up
  while (currentLevel.length > 1) {
    const nextLevel: GraphNode[] = [];
    const assigned = new Set<string>();

    // Find clusters of similar nodes
    for (let i = 0; i < currentLevel.length; i++) {
      const node = currentLevel[i];
      if (assigned.has(node.id)) continue;

      // Find nodes similar to this one
      const cluster: GraphNode[] = [node];
      assigned.add(node.id);

      for (let j = i + 1; j < currentLevel.length; j++) {
        const other = currentLevel[j];
        if (assigned.has(other.id)) continue;

        const similarity = cosineSimilarity(node.embedding!, other.embedding!);
        if (similarity >= similarityThreshold) {
          cluster.push(other);
          assigned.add(other.id);
        }
      }

      // Create parent node if cluster has multiple members
      if (cluster.length > 1) {
        const parentId = `abstract:L${level + 1}:${i}`;
        const clusterEmbeddings = cluster.map(n => n.embedding!);
        const centroid = computeCentroid(clusterEmbeddings);

        const parentNode: GraphNode = {
          id: parentId,
          type: 'subject',
          label: `[${cluster.map(n => n.label.slice(0, 10)).join(', ')}...]`,
          keywords: [...new Set(cluster.flatMap(n => n.keywords))],
          abstractionLevel: level + 1,
          children: cluster.map(n => n.id),
          embedding: centroid,
          embeddingModel: cluster[0].embeddingModel
        };

        // Update children to point to parent
        for (const child of cluster) {
          child.parent = parentId;
          hierarchyEdges.push({
            source: parentId,
            target: child.id,
            type: 'hierarchy',
            weight: 1
          });
        }

        allNodes.push(parentNode);
        nextLevel.push(parentNode);
      } else {
        // Singleton cluster - promote to next level
        node.abstractionLevel = level + 1;
        nextLevel.push(node);
      }
    }

    if (nextLevel.length === currentLevel.length) {
      // No progress - lower threshold or stop
      break;
    }

    currentLevel = nextLevel;
    level++;

    // Safety limit
    if (level > 10) break;
  }

  // Set remaining unprocessed nodes to level 0
  for (const node of nodesWithoutEmbeddings) {
    node.abstractionLevel = 0;
    node.children = [];
  }

  return { nodes: allNodes, hierarchyEdges };
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
      console.log(`[KnowledgeGraph] Found ${topics.length} topics:`, topics);

      for (const topicId of topics) {
        // Get topic to retrieve display name
        const topic = await nodeOneCore.topicAnalysisModel?.topicModel?.findTopic?.(topicId);
        const topicLabel = topic?.screenName || topic?.name || topicId;

        // Add topic as node
        const topicNode: GraphNode = {
          id: `topic:${topicId}`,
          type: 'topic',
          label: topicLabel,
          keywords: [],
          metadata: { topicId }
        };

        // Get subjects for this topic
        const subjects = await nodeOneCore.topicAnalysisModel.getSubjects(topicId);
        console.log(`[KnowledgeGraph] Topic ${topicId}: ${subjects.length} subjects`);

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

      // Generate embeddings for subject nodes
      const inferenceManager = getInferenceManager();
      if (inferenceManager.initialized) {
        const subjectNodes = nodes.filter(n => n.type === 'subject');
        const textsToEmbed = subjectNodes.map(n => n.label);

        if (textsToEmbed.length > 0) {
          console.log(`[KnowledgeGraph] Generating embeddings for ${textsToEmbed.length} subjects...`);
          try {
            const embeddings = await inferenceManager.embedBatch(textsToEmbed);
            const embeddingModel = inferenceManager.getEmbeddingProvider().model;

            for (let i = 0; i < subjectNodes.length; i++) {
              subjectNodes[i].embedding = embeddings[i];
              subjectNodes[i].embeddingModel = embeddingModel;
            }
            console.log(`[KnowledgeGraph] Generated ${embeddings.length} embeddings`);
          } catch (err) {
            console.warn('[KnowledgeGraph] Embedding generation failed, continuing without embeddings:', err);
          }
        }
      } else {
        console.log('[KnowledgeGraph] InferenceManager not initialized, skipping embeddings');
      }

      // Compute semantic edges based on shared keywords
      const semanticEdges: GraphEdge[] = [];
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

                semanticEdges.push({
                  source: nodeIds[i],
                  target: nodeIds[j],
                  type: 'semantic',
                  weight: sharedKeywords.length,
                  keywords: sharedKeywords
                });
              }
            }
          }
        }
      }

      // Build abstraction hierarchy from embeddings
      const { nodes: hierarchyNodes, hierarchyEdges } = buildAbstractionHierarchy(nodes);

      // Combine all edges
      const allEdges = [...semanticEdges, ...hierarchyEdges];

      console.log(`[KnowledgeGraph] Built graph with ${hierarchyNodes.length} nodes, ${allEdges.length} edges (${semanticEdges.length} semantic, ${hierarchyEdges.length} hierarchy)`);

      return { success: true, data: { nodes: hierarchyNodes, edges: allEdges } };
    } catch (error) {
      console.error('[IPC:memory:getKnowledgeGraph] Error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  console.log('[IPC] Knowledge graph handlers registered');
}
