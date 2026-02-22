/**
 * Groq API rate limiter and client wrapper.
 *
 * Handles rate limiting for Groq API calls to respect RPM (Requests Per Minute) and
 * TPM (Tokens Per Minute) limits. Provides a wrapper around the Groq SDK.
 */
/**
 * Rate limiter for Groq API calls to respect RPM and TPM limits
 */
declare class GroqRateLimiter {
    private maxRequestsPerMinute;
    private maxTokensPerMinute;
    private tokensPerRequest;
    private requestHistory;
    private tokenHistory;
    private locked;
    /**
     * Initialize Groq rate limiter
     *
     * @param maxRequestsPerMinute - Maximum requests per minute (default 28, conservative)
     * @param maxTokensPerMinute - Maximum tokens per minute (default 5800, conservative)
     * @param tokensPerRequest - Estimated tokens per request (default 1000)
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
     * Update the last request's token count with actual usage from Groq response
     *
     * @param actualTokens - Actual tokens used (prompt + completion)
     */
    updateTokenUsage(actualTokens: number): Promise<void>;
}
/**
 * Call Groq API to generate insights
 *
 * @param apiKey - Groq API key
 * @param systemMessage - System message for the LLM
 * @param userPrompt - User prompt with game data
 * @param rateLimiter - Rate limiter instance (defaults to global)
 * @returns Response from Groq API with content and usage
 */
export declare function callGroqApi(apiKey: string, systemMessage: string, userPrompt: string, rateLimiter?: GroqRateLimiter): Promise<{
    content: string;
    usage: {
        total_tokens?: number;
    };
}>;
/**
 * Get the global Groq rate limiter instance
 */
export declare function getGroqRateLimiter(): GroqRateLimiter;
declare const _default: {
    callGroqApi: typeof callGroqApi;
    getGroqRateLimiter: typeof getGroqRateLimiter;
    GroqRateLimiter: typeof GroqRateLimiter;
};
export default _default;
//# sourceMappingURL=groqClient.d.ts.map