import { ipcMain, BrowserWindow } from 'electron';
import { YouTubeService, registerYouTubeIPC, CubeLLMAdapter, CubeGlueAdapter, YouTubePlan } from '@refinio/lama.youtube';
import nodeOneCore from '../../core/node-one-core.js';
import llmManager from '../../services/llm-manager-singleton.js';
import { ChatPlan } from '@refinio/chat.core/plans/ChatPlan.js';
import { registerYouTubePlan } from '../../services/mcp-server-init.js';
import { planRegistry } from '@refinio/mcp.core/tools/PlanRegistry.js';
// ChatPlan is now imported via nodeOneCore.planRegistry or we can use the existing chat infrastructure

let youtubeService: YouTubeService | null = null;
let youtubePlan: YouTubePlan | null = null;

export async function registerYouTubeHandlers(mainWindow?: BrowserWindow) {
  if (!nodeOneCore.initialized) {
      console.warn('[YouTubeIPC] NodeOneCore not initialized, skipping registration');
      return;
  }

  // Adapter for LLM
  // We use the llm-manager-singleton logic wrapped in an adapter
  const llmAdapter = new CubeLLMAdapter({
      generateResponse: async (text: string) => {
          const response = await (llmManager as any).generateResponse({
              messages: [{ role: 'user', content: text }],
              model: (llmManager as any).defaultModelId
          });
          return response?.content || '';
      }
  });

  // Adapter for Glue (posting messages to topic)
  // We need to construct a ChatPlan. In the new architecture, we might get this from PlanRegistry
  // For now, we'll instantiate it directly if needed, or use the existing chat services
  // But wait, CubeGlueAdapter expects ChatPlan, TopicModel, and OneCore instance.

  // We can create a ChatPlan using the models from nodeOneCore
  const chatPlan = new ChatPlan(nodeOneCore.leuteModel, nodeOneCore.channelManager);

  const glueAdapter = new CubeGlueAdapter(chatPlan, nodeOneCore.topicModel, nodeOneCore.getInstance());

  youtubeService = new YouTubeService(nodeOneCore.getInstance(), llmAdapter, glueAdapter);

  // CRITICAL: Wait for config to load (including Gemini API key from secure storage)
  await youtubeService.init();
  console.log('[YouTubeIPC] YouTubeService initialized with config loaded');

  // Register the handlers with mainWindow for event forwarding
  registerYouTubeIPC(ipcMain, youtubeService, { mainWindow });

  // Create and register YouTubePlan for MCP access
  youtubePlan = new YouTubePlan({
    getGeminiApiKey: async () => {
      const config = youtubeService!.getConfig() as any;
      return config?.geminiApiKey;
    },
    setGeminiApiKey: async (key: string) => {
      const config = youtubeService!.getConfig();
      await youtubeService!.setConfig({ ...config, geminiApiKey: key } as any);
    }
  });

  // Initialize and register with MCP (HTTP API / external access)
  await youtubePlan.init();
  registerYouTubePlan(youtubePlan);

  // Register with PlanRegistry so the internal AI knows about these tools
  // Convert tool definitions to PlanRegistry format
  const toolDefs = YouTubePlan.getToolDefinitions();
  const youtubeTools = toolDefs.map((t: any) => ({
    name: t.name,
    description: t.description,
    params: Object.entries(t.inputSchema?.properties || {}).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type || 'string',
      description: prop.description || '',
      required: (t.inputSchema?.required || []).includes(name)
    })),
  }));

  planRegistry.registerPlan('youtube', 'media', youtubePlan, 'YouTube video summarization using Gemini AI', youtubeTools);
  console.log('[YouTubeIPC] Registered with PlanRegistry for AI tool access');

  console.log('[YouTubeIPC] Registered handlers');
}

/**
 * Get the YouTubePlan instance for external use
 */
export function getYouTubePlan(): YouTubePlan | null {
  return youtubePlan;
}
