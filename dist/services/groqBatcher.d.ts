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
/**
 * Generate batched Groq AI responses for multiple items in one API call
 *
 * @param options - Configuration options
 * @returns Dict mapping item IDs to results (or empty dict if generation fails)
 */
export declare function generateBatchedGroqResponses<T, R>(options: {
    items: T[];
    buildPromptFn: (items: T[]) => string;
    getSystemMessageFn: () => string;
    parseResponseFn: (response: Record<string, any>) => Record<string, R>;
    cacheKeyFn?: (items: T[]) => string;
    cacheTtl?: number;
    timeout?: number;
    emptyResult?: Record<string, R>;
}): Promise<Record<string, R>>;
/**
 * Clear all cached batched responses
 */
export declare function clearBatchCache(): void;
declare const _default: {
    generateBatchedGroqResponses: typeof generateBatchedGroqResponses;
    clearBatchCache: typeof clearBatchCache;
};
export default _default;
//# sourceMappingURL=groqBatcher.d.ts.map