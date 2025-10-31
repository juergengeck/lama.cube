"use strict";
/**
 * Type definitions for custom ONE.core objects used in LAMA
 * These re-export the types from @OneObjectInterfaces for convenience
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLLMObject = isLLMObject;
exports.isGlobalLLMSettings = isGlobalLLMSettings;
/**
 * Type guard for LLM objects
 */
function isLLMObject(obj) {
    return obj != null &&
        typeof obj === 'object' &&
        '$type$' in obj &&
        obj.$type$ === 'LLM';
}
/**
 * Type guard for GlobalLLMSettings objects
 */
function isGlobalLLMSettings(obj) {
    return obj != null &&
        typeof obj === 'object' &&
        '$type$' in obj &&
        obj.$type$ === 'GlobalLLMSettings';
}
