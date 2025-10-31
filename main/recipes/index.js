"use strict";
/**
 * LAMA Recipes
 * Defines ONE.core object types for LAMA-specific features
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LamaRecipes = void 0;
var WordCloudSettingsRecipe_js_1 = require("@lama/core/one-ai/recipes/WordCloudSettingsRecipe.js");
var KeywordRecipe_js_1 = require("@lama/core/one-ai/recipes/KeywordRecipe.js");
var SubjectRecipe_js_1 = require("@lama/core/one-ai/recipes/SubjectRecipe.js");
var SummaryRecipe_js_1 = require("@lama/core/one-ai/recipes/SummaryRecipe.js");
var KeywordAccessState_js_1 = require("@lama/core/one-ai/recipes/KeywordAccessState.js");
var proposal_recipes_js_1 = require("./proposal-recipes.js");
var mcp_recipes_js_1 = require("./mcp-recipes.js");
var avatar_recipes_js_1 = require("./avatar-recipes.js");
// import { FeedForwardRecipes } from './feed-forward-recipes.js'
// LLM Recipe - represents an AI model/assistant
var LLM_js_1 = require("./LLM.js");
// Assembly.core recipes - Demand/Supply/Assembly/Plan/Story
var core_1 = require("@assembly/core");
// Cube.core recipes - CubeObject, Dimension, DimensionValue, QueryResult
var cube_core_1 = require("@cube/cube.core");
var LLMSettingsRecipe = {
    $type$: 'Recipe',
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
};
var GlobalLLMSettingsRecipe = {
    $type$: 'Recipe',
    name: 'GlobalLLMSettings',
    rule: [
        {
            itemprop: 'name',
            itemtype: {
                type: 'string'
            },
            isId: true
        },
        {
            itemprop: 'defaultProvider',
            itemtype: {
                type: 'string'
            },
            optional: true
        },
        {
            itemprop: 'autoSelectBestModel',
            itemtype: {
                type: 'boolean'
            },
            optional: true
        },
        {
            itemprop: 'preferredModelIds',
            itemtype: {
                type: 'array',
                item: { type: 'string' }
            },
            optional: true
        },
        {
            itemprop: 'defaultModelId',
            itemtype: {
                type: 'string'
            },
            optional: true
        },
        {
            itemprop: 'temperature',
            itemtype: {
                type: 'number'
            },
            optional: true
        },
        {
            itemprop: 'maxTokens',
            itemtype: {
                type: 'integer'
            },
            optional: true
        },
        {
            itemprop: 'systemPrompt',
            itemtype: {
                type: 'string'
            },
            optional: true
        },
        {
            itemprop: 'streamResponses',
            itemtype: {
                type: 'boolean'
            },
            optional: true
        },
        {
            itemprop: 'autoSummarize',
            itemtype: {
                type: 'boolean'
            },
            optional: true
        },
        {
            itemprop: 'enableMCP',
            itemtype: {
                type: 'boolean'
            },
            optional: true
        },
        {
            itemprop: 'maxConcurrentRequests',
            itemtype: {
                type: 'integer'
            },
            optional: true
        }
    ]
};
// Export recipes for use in initInstance
// Note: Group recipe is already in CORE_RECIPES, don't duplicate it
var LamaRecipes = __spreadArray(__spreadArray(__spreadArray([
    LLM_js_1.LLMRecipe,
    LLMSettingsRecipe,
    GlobalLLMSettingsRecipe,
    WordCloudSettingsRecipe_js_1.WordCloudSettingsRecipe,
    SubjectRecipe_js_1.SubjectRecipe,
    KeywordRecipe_js_1.KeywordRecipe,
    SummaryRecipe_js_1.SummaryRecipe,
    KeywordAccessState_js_1.KeywordAccessStateRecipe,
    proposal_recipes_js_1.ProposalConfigRecipe,
    avatar_recipes_js_1.AvatarPreferenceRecipe
], mcp_recipes_js_1.MCPRecipes, true), core_1.AssemblyCoreRecipes, true), [
    // Cube.core recipes
    cube_core_1.CubeObjectRecipe,
    cube_core_1.DimensionRecipe,
    cube_core_1.DimensionValueRecipe,
    cube_core_1.QueryResultRecipe
], false);
exports.LamaRecipes = LamaRecipes;
