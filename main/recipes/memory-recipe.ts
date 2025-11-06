/**
 * Memory Recipe for ONE.core
 * Represents a discrete memory/insight that can be owned by a Person
 *
 * ID: content + author (SHA256IdHash<Person>)
 * This allows the same author to version/update their memory about the same content
 */

export const MemoryRecipe = {
  $type$: 'Recipe' as const,
  name: 'Memory',
  rule: [
    {
      itemprop: 'content',
      itemtype: {
        type: 'string'
      },
      isId: true
    },
    {
      itemprop: 'author',
      itemtype: {
        type: 'referenceToId',
        allowedTypes: new Set(['Person'])
      },
      isId: true
    },
    {
      itemprop: 'memoryType',
      itemtype: {
        type: 'string' // conversation, fact, reference, note, summary, milestone
      }
    },
    {
      itemprop: 'timestamp',
      itemtype: {
        type: 'string' // ISO 8601 date string
      }
    },
    {
      itemprop: 'importance',
      itemtype: {
        type: 'number' // 0-1 relevance score
      },
      optional: true
    },
    {
      itemprop: 'tags',
      itemtype: {
        type: 'array',
        item: { type: 'string' }
      },
      optional: true
    },
    {
      itemprop: 'topicRef',
      itemtype: {
        type: 'string' // Topic ID back-reference
      },
      optional: true
    },
    {
      itemprop: 'filename',
      itemtype: {
        type: 'string' // Human-readable filename for storage (e.g., "2025-01-05-my-insight.md")
      }
    }
  ]
};
