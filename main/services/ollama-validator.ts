/**
 * Ollama validation utilities
 * URL format validation and connection testing
 */

import fetch from 'node-fetch';
import type {
  ValidationResult,
  TestConnectionResponse,
  OllamaModel,
} from '../types/llm-config.js';
import {
  fetchModelCapabilities,
  getLocalOllamaModels as getLocalOllamaModelsCore
} from '@refinio/lama.core/services/ollama.js';

/**
 * Validate Ollama server URL format
 */
export function validateOllamaUrl(baseUrl: string): ValidationResult {
  try {
    const url = new URL(baseUrl);

    // Check protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        valid: false,
        error: 'URL must start with http:// or https://',
        errorCode: 'INVALID_URL',
      };
    }

    // Check hostname exists
    if (!url.hostname) {
      return {
        valid: false,
        error: 'Invalid URL: missing hostname',
        errorCode: 'INVALID_URL',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format. Must be http://hostname:port or https://hostname:port',
      errorCode: 'INVALID_URL',
    };
  }
}

/**
 * Normalize Ollama URL (add default port if missing, remove trailing slash)
 */
export function normalizeOllamaUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);

    // Add default port if not specified
    if (!url.port && url.protocol === 'http:') {
      url.port = '11434';
    }

    // Remove trailing slash
    let normalized = url.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return baseUrl;
  }
}

/**
 * Test connection to Ollama server and fetch available models
 */
export async function testOllamaConnection(
  baseUrl: string,
  authToken?: string
): Promise<TestConnectionResponse> {
  // Validate URL format first
  const validation = validateOllamaUrl(baseUrl);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error!,
      errorCode: validation.errorCode!,
    };
  }

  const normalizedUrl = normalizeOllamaUrl(baseUrl);

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Test connectivity with 2-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${normalizedUrl}/api/tags`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Check for auth failure
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'Authentication failed. Check credentials.',
        errorCode: 'AUTH_FAILED',
      };
    }

    // Check if response is OK
    if (!response.ok) {
      return {
        success: false,
        error: `Server returned status ${response.status}`,
        errorCode: 'NETWORK_ERROR',
      };
    }

    // Parse response
    const data: any = await response.json();

    // Extract models
    const models: OllamaModel[] = data.models || [];

    if (models.length === 0) {
      return {
        success: false,
        error: 'Server has no models installed.',
        errorCode: 'NO_MODELS',
      };
    }

    // Map to our model format
    const formattedModels: OllamaModel[] = models.map((model: any) => ({
      name: model.name || model.model,
      size: model.size || 0,
      modified: model.modified_at || model.modified || new Date().toISOString(),
      digest: model.digest || '',
    }));

    return {
      success: true,
      models: formattedModels,
      serverInfo: {
        version: data.version,
      },
    };
  } catch (error: any) {
    // Handle timeout
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Connection timeout. Server is unreachable.',
        errorCode: 'NETWORK_ERROR',
      };
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Cannot connect to server. Check address and network.',
        errorCode: 'NETWORK_ERROR',
      };
    }

    // Generic error
    return {
      success: false,
      error: error.message || 'Connection failed',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * Re-export fetchModelCapabilities from core with Ollama-specific name
 * for backwards compatibility
 */
export async function fetchOllamaModelCapabilities(
  baseUrl: string,
  modelName: string,
  authToken?: string
): Promise<string[]> {
  const normalizedUrl = normalizeOllamaUrl(baseUrl);
  return fetchModelCapabilities(modelName, normalizedUrl, authToken);
}

/**
 * Fetch available models from Ollama server with capabilities
 * Uses core's getLocalOllamaModels with URL normalization
 */
export async function fetchOllamaModels(
  baseUrl: string,
  authToken?: string
): Promise<OllamaModel[]> {
  const normalizedUrl = normalizeOllamaUrl(baseUrl);

  // First test connection to provide better error messages
  const result = await testOllamaConnection(baseUrl, authToken);
  if (!result.success) {
    const error = (result as { error: string }).error || 'Failed to fetch models';
    throw new Error(error);
  }

  // Use core function with auth support
  const coreModels = await getLocalOllamaModelsCore(normalizedUrl, authToken);

  // Map core format (modified_at) to cube format (modified)
  return coreModels.map(model => ({
    name: model.name,
    size: model.size,
    digest: model.digest,
    modified: model.modified_at,
    capabilities: model.capabilities
  }));
}
