/**
 * LAMA Recipes
 * Defines ONE.core object types for LAMA-specific features
 */

import { addRecipeToRuntime } from '@refinio/one.core/lib/object-recipes.js'
import { WordCloudSettingsRecipe } from '@refinio/lama.core/one-ai/recipes/WordCloudSettingsRecipe.js'
import { KeywordRecipe } from '@refinio/lama.core/one-ai/recipes/KeywordRecipe.js'
import { SubjectRecipe } from '@refinio/lama.core/one-ai/recipes/SubjectRecipe.js'
import { SubjectDescriptionRecipe } from '@refinio/lama.core/one-ai/recipes/SubjectDescriptionRecipe.js'
import { SummaryRecipe } from '@refinio/lama.core/one-ai/recipes/SummaryRecipe.js'
import { KeywordAccessStateRecipe } from '@refinio/lama.core/one-ai/recipes/KeywordAccessState.js'
import { LamaReverseMaps, LamaReverseMapsForIdObjects } from '@refinio/lama.core/one-ai/recipes/reversemaps.js'
import {
    ProposalConfigRecipe,
    ProposalRecipe,
    ProposalInteractionPlanRecipe,
    ProposalInteractionResponseRecipe,
    GlobalLLMSettingsRecipe
} from '@refinio/lama.core/recipes/index.js'
import { MCPRecipes } from './mcp-recipes.js'
import { AvatarPreferenceRecipe } from './avatar-recipes.js'
// import { FeedForwardRecipes } from './feed-forward-recipes.js'

// LLM Recipe - represents an AI model/assistant
import { LLMRecipe } from '@refinio/lama.core/recipes/LLMRecipe.js'

// TTS Recipe - represents a Text-to-Speech model with blob storage
import { TTSRecipe } from '@refinio/chat.core/recipes/TTSRecipe.js'

// STT Recipe - represents a Speech-to-Text model (Whisper) with blob storage
import { STTRecipe } from '@refinio/chat.core/recipes/STTRecipe.js'

// AI Recipe - represents AI assistant identities
// AIList Recipe - tracks all AI objects for enumeration
import { AIRecipe, AIListRecipe } from '@refinio/lama.core/recipes/AIRecipe.js'

// AISettings Recipe - AI assistant application settings per instance
import { AISettingsRecipe } from '@refinio/lama.core/recipes/AISettingsRecipe.js'

// Chat Memory Recipes - config and association for topic memory extraction
import { ChatMemoryConfigRecipe, ChatMemoryAssociationRecipe } from './chat-memory-config.js'

// Memory Recipe from memory.core - for storing structured memories
import { MemoryRecipe } from '@refinio/memory.core/recipes/MemoryRecipe.js'

// UserSettings Recipe - consolidated user settings (AI, UI, proposals)
import { UserSettingsRecipe } from './user-settings-recipe.js'

// YouTube Recipes
import { YouTubeConfigRecipe, ProcessedVideoRecipe } from '@refinio/lama.youtube'

// Assembly.core recipes - Assembly/Plan/Story (NOT Demand/Supply - those come from one.models)
import { AssemblyCoreRecipes } from '@refinio/assembly.core'

const LLMSettingsRecipe = {
    $type$: 'Recipe' as const,
    name: 'LLMSettings',
    rule: [
        {
            itemprop: 'selectedLLMId',
            itemtype: {
                type: 'string'
            },
            optional: true
        },
        {
            itemprop: 'enabledLLMs',
            itemtype: {
                type: 'bag',
                item: { type: 'string' }
            },
            optional: true
        },
        {
            itemprop: 'disabledLLMs',
            itemtype: {
                type: 'bag',
                item: { type: 'string' }
            },
            optional: true
        }
    ]
}

// Export recipes for use in initInstance
// Note: Group recipe is already in CORE_RECIPES, don't duplicate it
const LamaRecipes = [
    LLMRecipe,
    TTSRecipe,
    STTRecipe,
    AIRecipe,
    AIListRecipe,
    AISettingsRecipe,
    LLMSettingsRecipe,
    GlobalLLMSettingsRecipe,
    WordCloudSettingsRecipe,
    SubjectRecipe,
    SubjectDescriptionRecipe,
    KeywordRecipe,
    SummaryRecipe,
    KeywordAccessStateRecipe,
    // Proposal system (Plan/Response architecture)
    ProposalConfigRecipe,
    ProposalRecipe,
    ProposalInteractionPlanRecipe,
    ProposalInteractionResponseRecipe,
    UserSettingsRecipe,
    AvatarPreferenceRecipe,
    ChatMemoryConfigRecipe,
    ChatMemoryAssociationRecipe,
    MemoryRecipe,
    YouTubeConfigRecipe,
    ProcessedVideoRecipe,
    ...MCPRecipes,
    // ...FeedForwardRecipes
    // Assembly.core recipes (Assembly/Plan/Story)
    ...AssemblyCoreRecipes
    // NOTE: CubeCoreRecipes imported directly in CoreInstanceInitializationPlan
]

export { LamaRecipes, LamaReverseMaps, LamaReverseMapsForIdObjects }
