/**
 * ONE.core Recipes for Proposal System
 *
 * Architecture: Plan/Response Pattern
 * - ProposalConfig: User preferences for proposal generation
 * - Proposal: Immutable recommendation (system suggests linking past/current subjects)
 * - ProposalInteractionPlan: User's intent to interact with proposal
 * - ProposalInteractionResponse: Result of executing the plan
 */

/**
 * ProposalConfig Recipe
 * User configuration for proposal matching and ranking algorithm
 * Versioned object with userEmail as ID property
 */
export const ProposalConfigRecipe = {
    $type$: 'Recipe',
    name: 'ProposalConfig',
    rule: [
        {
            itemprop: '$type$',
            itemtype: { type: 'string', regexp: /^ProposalConfig$/ }
        },
        {
            itemprop: 'userEmail',
            itemtype: { type: 'string' },
            isId: true // Makes this a versioned object per user
        },
        {
            itemprop: 'matchWeight',
            itemtype: { type: 'number' } // 0.0 to 1.0
        },
        {
            itemprop: 'recencyWeight',
            itemtype: { type: 'number' } // 0.0 to 1.0
        },
        {
            itemprop: 'recencyWindow',
            itemtype: { type: 'integer' } // milliseconds
        },
        {
            itemprop: 'minJaccard',
            itemtype: { type: 'number' } // 0.0 to 1.0, minimum threshold
        },
        {
            itemprop: 'maxProposals',
            itemtype: { type: 'integer' } // Maximum proposals to return
        },
        {
            itemprop: 'updatedAt',
            itemtype: { type: 'integer' } // Last update timestamp
        },
        {
            itemprop: '$versionHash$',
            itemtype: { type: 'string' },
            optional: true
        }
    ]
};

/**
 * Proposal Recipe
 *
 * Immutable recommendation to share knowledge from a past subject
 * Deterministic ID: topicId + pastSubject + currentSubject
 *
 * This is pure data - no user interaction state
 * User interactions are tracked via ProposalInteractionPlan/Response
 */
export const ProposalRecipe = {
    $type$: 'Recipe',
    name: 'Proposal',
    rule: [
        {
            itemprop: '$type$',
            itemtype: { type: 'string', regexp: /^Proposal$/ }
        },
        {
            itemprop: 'topicId',
            itemtype: { type: 'string' },
            isId: true // Part of deterministic ID
        },
        {
            itemprop: 'pastSubject',
            itemtype: { type: 'string' },
            isId: true // Part of deterministic ID
        },
        {
            itemprop: 'currentSubject',
            itemtype: { type: 'string' },
            isId: true, // Part of deterministic ID
            optional: true // May be null for topic-level proposals
        },
        {
            itemprop: 'matchedKeywords',
            itemtype: { type: 'array', item: { type: 'string' } } // Array of keyword terms
        },
        {
            itemprop: 'relevanceScore',
            itemtype: { type: 'number' }
        },
        {
            itemprop: 'sourceTopicId',
            itemtype: { type: 'string' } // Where the past subject comes from
        },
        {
            itemprop: 'pastSubjectName',
            itemtype: { type: 'string' }
        },
        {
            itemprop: 'createdAt',
            itemtype: { type: 'integer' }
        },
        {
            itemprop: '$versionHash$',
            itemtype: { type: 'string' },
            optional: true
        }
    ]
};

/**
 * ProposalInteractionPlan Recipe
 *
 * User's plan to interact with a proposal
 * Actions: 'view', 'dismiss', 'share'
 * Deterministic ID: userEmail + proposalIdHash + action
 */
export const ProposalInteractionPlanRecipe = {
    $type$: 'Recipe',
    name: 'ProposalInteractionPlan',
    rule: [
        {
            itemprop: '$type$',
            itemtype: { type: 'string', regexp: /^ProposalInteractionPlan$/ }
        },
        {
            itemprop: 'userEmail',
            itemtype: { type: 'string' },
            isId: true // Part of composite ID
        },
        {
            itemprop: 'proposalIdHash',
            itemtype: { type: 'string' },
            isId: true // Part of composite ID
        },
        {
            itemprop: 'action',
            itemtype: { type: 'string', regexp: /^(view|dismiss|share)$/ },
            isId: true // Part of composite ID (allows multiple views)
        },
        {
            itemprop: 'topicId',
            itemtype: { type: 'string' } // Context: where the interaction happened
        },
        {
            itemprop: 'createdAt',
            itemtype: { type: 'integer' }
        },
        {
            itemprop: '$versionHash$',
            itemtype: { type: 'string' },
            optional: true
        }
    ]
};

/**
 * ProposalInteractionResponse Recipe
 *
 * Result of executing a ProposalInteractionPlan
 * Deterministic ID: planIdHash
 */
export const ProposalInteractionResponseRecipe = {
    $type$: 'Recipe',
    name: 'ProposalInteractionResponse',
    rule: [
        {
            itemprop: '$type$',
            itemtype: { type: 'string', regexp: /^ProposalInteractionResponse$/ }
        },
        {
            itemprop: 'plan',
            itemtype: { type: 'string' },
            isId: true // One response per plan
        },
        {
            itemprop: 'success',
            itemtype: { type: 'boolean' }
        },
        {
            itemprop: 'executedAt',
            itemtype: { type: 'integer' }
        },
        {
            itemprop: 'sharedToTopicId',
            itemtype: { type: 'string' },
            optional: true // Only for 'share' actions
        },
        {
            itemprop: 'viewDuration',
            itemtype: { type: 'integer' },
            optional: true // Only for 'view' actions (milliseconds)
        },
        {
            itemprop: 'error',
            itemtype: { type: 'string' },
            optional: true // If success = false
        },
        {
            itemprop: '$versionHash$',
            itemtype: { type: 'string' },
            optional: true
        }
    ]
};
