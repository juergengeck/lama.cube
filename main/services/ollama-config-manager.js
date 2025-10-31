"use strict";
/**
 * Ollama configuration manager
 * Handles token encryption/decryption and config management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
exports.isEncryptionAvailable = isEncryptionAvailable;
exports.getDefaultOllamaUrl = getDefaultOllamaUrl;
exports.computeBaseUrl = computeBaseUrl;
var electron_1 = require("electron");
/**
 * Encrypt an auth token using Electron's safeStorage
 * Uses OS-level encryption (Keychain on macOS, DPAPI on Windows, libsecret on Linux)
 */
function encryptToken(plainToken) {
    if (!plainToken) {
        throw new Error('Cannot encrypt empty token');
    }
    try {
        var encrypted = electron_1.safeStorage.encryptString(plainToken);
        return encrypted.toString('base64');
    }
    catch (error) {
        console.error('[OllamaConfig] Token encryption failed:', error);
        throw new Error("Token encryption failed: ".concat(error.message));
    }
}
/**
 * Decrypt an auth token using Electron's safeStorage
 */
function decryptToken(encryptedBase64) {
    if (!encryptedBase64) {
        throw new Error('Cannot decrypt empty token');
    }
    try {
        var buffer = Buffer.from(encryptedBase64, 'base64');
        var decrypted = electron_1.safeStorage.decryptString(buffer);
        return decrypted;
    }
    catch (error) {
        console.error('[OllamaConfig] Token decryption failed:', error);
        throw new Error("Token decryption failed: ".concat(error.message));
    }
}
/**
 * Check if safeStorage is available
 */
function isEncryptionAvailable() {
    return electron_1.safeStorage.isEncryptionAvailable();
}
/**
 * Compute default base URL for local Ollama
 */
function getDefaultOllamaUrl() {
    return 'http://localhost:11434';
}
/**
 * Compute effective base URL from config
 * Local type defaults to localhost, remote type uses stored baseUrl
 */
function computeBaseUrl(modelType, baseUrl) {
    if (modelType === 'local') {
        return baseUrl || getDefaultOllamaUrl();
    }
    if (modelType === 'remote' && !baseUrl) {
        throw new Error('Remote Ollama requires baseUrl');
    }
    return baseUrl;
}
