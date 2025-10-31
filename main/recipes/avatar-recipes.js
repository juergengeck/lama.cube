"use strict";
/**
 * Avatar Preference Recipe
 * Stores persistent avatar color preferences for contacts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvatarPreferenceRecipe = void 0;
exports.AvatarPreferenceRecipe = {
    $type$: 'Recipe',
    name: 'AvatarPreference',
    rule: [
        {
            itemprop: 'personId',
            itemtype: {
                type: 'string'
            },
            isId: true
        },
        {
            itemprop: 'color',
            itemtype: {
                type: 'string'
            }
        },
        {
            itemprop: 'mood',
            itemtype: {
                type: 'string'
            },
            optional: true
        },
        {
            itemprop: 'updatedAt',
            itemtype: {
                type: 'integer'
            }
        }
    ]
};
