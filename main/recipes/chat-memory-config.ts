/**
 * ChatMemoryConfig Recipe for ONE.core
 * Stores configuration for chat memory extraction per topic
 */

export const ChatMemoryAssociationRecipe = {
    $type$: 'Recipe' as const,
    name: 'ChatMemoryAssociation',
    rule: [
        {
            itemprop: '$type$',
            itemtype: { type: 'string', regexp: /^ChatMemoryAssociation$/ }
        },
        {
            itemprop: 'id',
            itemtype: { type: 'string' },
            isId: true
        },
        {
            itemprop: 'topicId',
            itemtype: { type: 'string' }
        },
        {
            itemprop: 'subjectIdHash',
            itemtype: { type: 'string' }
        },
        {
            itemprop: 'keywords',
            itemtype: {
                type: 'array',
                item: { type: 'string' }
            }
        },
        {
            itemprop: 'confidence',
            itemtype: { type: 'number' }
        },
        {
            itemprop: 'created',
            itemtype: { type: 'number' }
        },
        {
            itemprop: 'lastUpdated',
            itemtype: { type: 'number' }
        },
        {
            itemprop: 'messageCount',
            itemtype: { type: 'number' }
        }
    ]
};

export const ChatMemoryConfigRecipe = {
    $type$: 'Recipe' as const,
    name: 'ChatMemoryConfig',
    rule: [
        {
            itemprop: '$type$',
            itemtype: { type: 'string', regexp: /^ChatMemoryConfig$/ }
        },
        {
            itemprop: 'topicId',
            itemtype: { type: 'string' },
            isId: true  // Makes this a versioned object with topicId as the ID
        },
        {
            itemprop: 'enabled',
            itemtype: { type: 'boolean' }
        },
        {
            itemprop: 'autoExtract',
            itemtype: { type: 'boolean' }
        },
        {
            itemprop: 'updateInterval',
            itemtype: { type: 'number' },
            optional: true  // Legacy field, keeping for backward compat
        },
        {
            itemprop: 'minConfidence',
            itemtype: { type: 'number' }
        },
        {
            itemprop: 'keywords',
            itemtype: {
                type: 'array',
                item: { type: 'string' }
            },
            optional: true
        }
    ]
};
