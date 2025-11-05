/**
 * UserSettings Recipe for ONE.core
 *
 * Defines the schema for consolidated user settings (AI, UI, proposals).
 * Replaces GlobalLLMSettings, WordCloudSettings, and ProposalConfig.
 */

import type { Recipe } from '@refinio/one.core/lib/recipes.js';

export const UserSettingsRecipe: Recipe = {
    $type$: 'Recipe',
    name: 'UserSettings',
    rule: [
        {
            itemprop: 'userEmail',
            isId: true, // ID field for versioning
            itemtype: { type: 'string' }
        },
        {
            itemprop: 'ai',
            itemtype: {
                type: 'object',
                rules: [
                    { itemprop: 'defaultModelId', itemtype: { type: 'string' }, optional: true },
                    { itemprop: 'temperature', itemtype: { type: 'number' } },
                    { itemprop: 'maxTokens', itemtype: { type: 'number' } },
                    { itemprop: 'defaultProvider', itemtype: { type: 'string' } },
                    { itemprop: 'autoSelectBestModel', itemtype: { type: 'boolean' } },
                    {
                        itemprop: 'preferredModelIds',
                        itemtype: {
                            type: 'array',
                            item: { type: 'string' }
                        }
                    },
                    { itemprop: 'systemPrompt', itemtype: { type: 'string' }, optional: true },
                    { itemprop: 'streamResponses', itemtype: { type: 'boolean' } },
                    { itemprop: 'autoSummarize', itemtype: { type: 'boolean' } },
                    { itemprop: 'enableMCP', itemtype: { type: 'boolean' } },
                    {
                        itemprop: 'apiKeys',
                        itemtype: {
                            type: 'map',
                            key: { type: 'string' },
                            value: { type: 'string' }
                        },
                        optional: true
                    }
                ]
            }
        },
        {
            itemprop: 'ui',
            itemtype: {
                type: 'object',
                rules: [
                    {
                        itemprop: 'theme',
                        itemtype: {
                            type: 'string',
                            regexp: /^(dark|light)$/
                        }
                    },
                    { itemprop: 'notifications', itemtype: { type: 'boolean' } },
                    {
                        itemprop: 'wordCloud',
                        itemtype: {
                            type: 'object',
                            rules: [
                                { itemprop: 'maxWordsPerSubject', itemtype: { type: 'number' } },
                                { itemprop: 'relatedWordThreshold', itemtype: { type: 'number' } },
                                { itemprop: 'minWordFrequency', itemtype: { type: 'number' } },
                                { itemprop: 'showSummaryKeywords', itemtype: { type: 'boolean' } },
                                { itemprop: 'fontScaleMin', itemtype: { type: 'number' } },
                                { itemprop: 'fontScaleMax', itemtype: { type: 'number' } },
                                { itemprop: 'colorScheme', itemtype: { type: 'string' } },
                                { itemprop: 'layoutDensity', itemtype: { type: 'string' } }
                            ]
                        }
                    }
                ]
            }
        },
        {
            itemprop: 'proposals',
            itemtype: {
                type: 'object',
                rules: [
                    { itemprop: 'matchWeight', itemtype: { type: 'number' } },
                    { itemprop: 'recencyWeight', itemtype: { type: 'number' } },
                    { itemprop: 'recencyWindow', itemtype: { type: 'number' } },
                    { itemprop: 'minJaccard', itemtype: { type: 'number' } },
                    { itemprop: 'maxProposals', itemtype: { type: 'number' } }
                ]
            }
        },
        {
            itemprop: 'updatedAt',
            itemtype: { type: 'number' }
        }
    ]
};
