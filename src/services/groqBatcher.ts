/**
 * Reusable utility for batched Groq AI calls.
 *
 * This module provides a generic batching pattern that all Groq AI features should use.
 * Instead of calling Groq per-item, we batch multiple items into one API call for efficiency.
 *
 * Usage:
 *   const results = await generateBatchedGroqResponses({
 *     items: games,
 *     buildPromptFn: (items) => buildMyPrompt(items),
 *     getSystemMessageFn: () => getMySystemMessage(),
 *     parseResponseFn: (response) => parseMyResponse(response),
 *     cacheKeyFn: (items) => createCacheKey(items),
 *     cacheTtl: 60.0,
 *     timeout: 10.0,
 *   });
 */

import { callGroqApi, getGroqRateLimiter } from './groqClient';

// Generic cache for batched responses
const batchCache = new Map<
  string,
  { data: Record<string, any>; timestamp: number }
>();
const BATCH_CACHE_MAX_SIZE = 1000; // Maximum 1000 cached responses

/**
 * Generate batched Groq AI responses for multiple items in one API call
 *
 * @param options - Configuration options
 * @returns Dict mapping item IDs to results (or empty dict if generation fails)
 */
export async function generateBatchedGroqResponses<T, R>(options: {
  items: T[];
  buildPromptFn: (items: T[]) => string;
  getSystemMessageFn: () => string;
  parseResponseFn: (response: Record<string, any>) => Record<string, R>;
  cacheKeyFn?: (items: T[]) => string;
  cacheTtl?: number;
  timeout?: number;
  emptyResult?: Record<string, R>;
}): Promise<Record<string, R>> {
  const {
    items,
    buildPromptFn,
    getSystemMessageFn,
    parseResponseFn,
    cacheKeyFn,
    cacheTtl = 60.0,
    timeout = 10.0,
    emptyResult = {}
  } = options;

  if (!items || items.length === 0) {
    return emptyResult;
  }

  // Clean up expired entries periodically
  if (batchCache.size > BATCH_CACHE_MAX_SIZE * 0.9) {
    cleanupBatchCache();
  }

  // Check cache if cacheKeyFn provided
  let cacheKey: string | null = null;
  if (cacheKeyFn) {
    cacheKey = cacheKeyFn(items);
    const cached = batchCache.get(cacheKey);
    if (cached && Date.now() / 1000 - cached.timestamp < cacheTtl) {
      console.log(
        `[Groq Batcher] Returning cached response for ${items.length} items`
      );
      return cached.data;
    } else if (cached) {
      batchCache.delete(cacheKey);
    }
  }

  // Build prompt and system message
  const prompt = buildPromptFn(items);
  const systemMessage = getSystemMessageFn();

  try {
    // Call Groq API with timeout
    let response: { content: string; usage: any };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      response = await callGroqApi(
        process.env.GROQ_API_KEY || '',
        systemMessage,
        prompt,
        getGroqRateLimiter()
      );

      clearTimeout(timeoutId);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`[Groq Batcher] Timeout after ${timeout}s`);
        return emptyResult;
      }
      throw error;
    }

    if (!response || !response.content) {
      console.warn('[Groq Batcher] Empty response from Groq');
      return emptyResult;
    }

    // Parse JSON response
    let content = response.content;

    // Remove markdown code blocks if present
    if (content.includes('```json')) {
      content = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      content = content.split('```')[1].split('```')[0].trim();
    }

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.warn('[Groq Batcher] Failed to parse JSON response');
      console.debug(`[Groq Batcher] Response (first 500 chars): ${content.substring(0, 500)}`);
      return emptyResult;
    }

    // Parse response using provided function
    const results = parseResponseFn(parsed);

    // Cache result if cacheKey provided
    if (cacheKey && Object.keys(results).length > 0) {
      batchCache.set(cacheKey, {
        data: results,
        timestamp: Date.now() / 1000
      });
      console.log(
        `[Groq Batcher] Cached response for ${items.length} items`
      );
    }

    console.log(
      `[Groq Batcher] Generated response for ${items.length} items, ` +
      `${Object.keys(results).length} results`
    );
    return results;
  } catch (error) {
    console.warn('[Groq Batcher] Error generating batched responses:', error);
    return emptyResult;
  }
}

/**
 * Remove expired entries and enforce size limit
 */
function cleanupBatchCache(): void {
  const currentTime = Date.now() / 1000;

  // Remove expired entries (>1 hour old)
  const expiredKeys: string[] = [];
  for (const [key, value] of batchCache) {
    if (currentTime - value.timestamp > 3600.0) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    batchCache.delete(key);
  }

  // Enforce size limit (remove oldest entries)
  if (batchCache.size > BATCH_CACHE_MAX_SIZE) {
    // Convert to array and sort by timestamp
    const entries = Array.from(batchCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const keysToRemove = entries
      .slice(0, entries.length - BATCH_CACHE_MAX_SIZE)
      .map(([key]) => key);

    for (const key of keysToRemove) {
      batchCache.delete(key);
    }

    console.log(
      `[Groq Batcher] LRU eviction: removed ${keysToRemove.length} old entries`
    );
  }

  if (expiredKeys.length > 0) {
    console.log(
      `[Groq Batcher] Cleaned up ${expiredKeys.length} expired entries`
    );
  }
}

/**
 * Clear all cached batched responses
 */
export function clearBatchCache(): void {
  batchCache.clear();
}

export default {
  generateBatchedGroqResponses,
  clearBatchCache
};
