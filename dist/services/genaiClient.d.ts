/**
 * Google GenAI API rate limiter and client wrapper.
 *
 * Handles rate limiting for Google GenAI API calls to respect RPM (Requests Per Minute) and
 * TPM (Tokens Per Minute) limits. Provides a wrapper around the Google GenAI SDK.
 */
/**
 * Rate limiter for Google GenAI API calls to respect RPM and TPM limits
 */
declare class GenAIRateLimiter {
    private maxRequestsPerMinute;
    private maxTokensPerMinute;
    private tokensPerRequest;
    private requestHistory;
    private tokenHistory;
    private locked;
    /**
     * Initialize Google GenAI rate limiter
     *
     * @param maxRequestsPerMinute - Maximum requests per minute (default 20, conservative)
     * @param maxTokensPerMinute - Maximum tokens per minute (default 5500, conservative)
     * @param tokensPerRequest - Estimated tokens per request (default 2000)
     */
    constructor(maxRequestsPerMinute?: number, maxTokensPerMinute?: number, tokensPerRequest?: number);
    /**
     * Wait if we're approaching the rate limit.
     * Uses rolling 60-second windows to track both RPM and TPM.
     *
     * @param estimatedTokens - Estimated tokens for this request
     */
    waitIfNeeded(estimatedTokens?: number): Promise<void>;
    /**
     * Update the last request's token count with actual usage from GenAI response
     *
     * @param actualTokens - Actual tokens used (prompt + completion)
     */
    updateTokenUsage(actualTokens: number): Promise<void>;
}
/**
 * Call Google GenAI API to generate insights
 *
 * @param apiKey - Google GenAI API key
 * @param systemMessage - System message for the LLM
 * @param userPrompt - User prompt with game data
 * @param rateLimiter - Rate limiter instance (defaults to global)
 * @returns Response from GenAI API with content and usage
 */
export declare function callGenaiApi(apiKey: string, systemMessage: string, userPrompt: string, rateLimiter?: GenAIRateLimiter): Promise<{
    content: string;
    usage: {
        total_tokens?: number;
    };
}>;
/**
 * Get the global GenAI rate limiter instance
 */
export declare function getGenaiRateLimiter(): GenAIRateLimiter;
declare const _default: {
    callGenaiApi: typeof callGenaiApi;
    getGenaiRateLimiter: typeof getGenaiRateLimiter;
    GenAIRateLimiter: typeof GenAIRateLimiter;
};
export default _default;
//# sourceMappingURL=genaiClient.d.ts.map