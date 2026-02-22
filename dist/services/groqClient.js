"use strict";
/**
 * Groq API rate limiter and client wrapper.
 *
 * Handles rate limiting for Groq API calls to respect RPM (Requests Per Minute) and
 * TPM (Tokens Per Minute) limits. Provides a wrapper around the Groq SDK.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.callGroqApi = callGroqApi;
exports.getGroqRateLimiter = getGroqRateLimiter;
const groq_sdk_1 = require("groq-sdk");
/**
 * Rate limiter for Groq API calls to respect RPM and TPM limits
 */
class GroqRateLimiter {
    /**
     * Initialize Groq rate limiter
     *
     * @param maxRequestsPerMinute - Maximum requests per minute (default 28, conservative)
     * @param maxTokensPerMinute - Maximum tokens per minute (default 5800, conservative)
     * @param tokensPerRequest - Estimated tokens per request (default 1000)
     */
    constructor(maxRequestsPerMinute = 28, maxTokensPerMinute = 5800, tokensPerRequest = 1000) {
        this.requestHistory = [];
        this.tokenHistory = [];
        this.locked = false;
        this.maxRequestsPerMinute = maxRequestsPerMinute;
        this.maxTokensPerMinute = maxTokensPerMinute;
        this.tokensPerRequest = tokensPerRequest;
    }
    /**
     * Wait if we're approaching the rate limit.
     * Uses rolling 60-second windows to track both RPM and TPM.
     *
     * @param estimatedTokens - Estimated tokens for this request
     */
    async waitIfNeeded(estimatedTokens) {
        // Acquire lock
        while (this.locked) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        this.locked = true;
        try {
            if (estimatedTokens === undefined) {
                estimatedTokens = this.tokensPerRequest;
            }
            const currentTime = Date.now() / 1000; // Convert to seconds
            // Remove entries older than 60 seconds (rolling window)
            while (this.requestHistory.length > 0 &&
                currentTime - this.requestHistory[0] > 60) {
                this.requestHistory.shift();
            }
            while (this.tokenHistory.length > 0 &&
                currentTime - this.tokenHistory[0][0] > 60) {
                this.tokenHistory.shift();
            }
            // Calculate how many requests and tokens we've used in the last 60 seconds
            const requestsUsed = this.requestHistory.length;
            const tokensUsed = this.tokenHistory.reduce((sum, [_, tokens]) => sum + tokens, 0);
            let waitTime = 0;
            // Check RPM limit - wait if we're at 90% of limit
            if (requestsUsed >=
                Math.floor(this.maxRequestsPerMinute * 0.9)) {
                if (this.requestHistory.length > 0) {
                    const oldestTime = this.requestHistory[0];
                    waitTime = Math.max(waitTime, 60 - (currentTime - oldestTime) + 1);
                }
            }
            // Check TPM limit - wait if we're at 85% of limit (more conservative for tokens)
            if (tokensUsed + estimatedTokens >
                Math.floor(this.maxTokensPerMinute * 0.85)) {
                if (this.tokenHistory.length > 0) {
                    const oldestTime = this.tokenHistory[0][0];
                    waitTime = Math.max(waitTime, 60 - (currentTime - oldestTime) + 2);
                }
            }
            // Wait if needed
            if (waitTime > 0) {
                console.log(`[Groq Rate Limit] Waiting ${waitTime.toFixed(1)}s ` +
                    `(RPM: ${requestsUsed}/${this.maxRequestsPerMinute}, ` +
                    `TPM: ${tokensUsed}/${this.maxTokensPerMinute})`);
                await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitTime * 1000)));
                // Clean up again after waiting
                const newTime = Date.now() / 1000;
                while (this.requestHistory.length > 0 &&
                    newTime - this.requestHistory[0] > 60) {
                    this.requestHistory.shift();
                }
                while (this.tokenHistory.length > 0 &&
                    newTime - this.tokenHistory[0][0] > 60) {
                    this.tokenHistory.shift();
                }
            }
            // Record this request
            this.requestHistory.push(Date.now() / 1000);
            this.tokenHistory.push([Date.now() / 1000, estimatedTokens]);
        }
        finally {
            this.locked = false;
        }
    }
    /**
     * Update the last request's token count with actual usage from Groq response
     *
     * @param actualTokens - Actual tokens used (prompt + completion)
     */
    async updateTokenUsage(actualTokens) {
        while (this.locked) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        this.locked = true;
        try {
            if (this.tokenHistory.length > 0) {
                const timestamp = this.tokenHistory[this.tokenHistory.length - 1][0];
                this.tokenHistory[this.tokenHistory.length - 1] = [timestamp, actualTokens];
            }
        }
        finally {
            this.locked = false;
        }
    }
}
// Global Groq rate limiter instance
// Conservative limits: 20 RPM (below 30) and 5500 TPM (below 6000, leaves 500 buffer)
// Token estimation increased to 2000 to account for larger batched requests
const groqRateLimiter = new GroqRateLimiter(20, 5500, 2000);
/**
 * Call Groq API to generate insights
 *
 * @param apiKey - Groq API key
 * @param systemMessage - System message for the LLM
 * @param userPrompt - User prompt with game data
 * @param rateLimiter - Rate limiter instance (defaults to global)
 * @returns Response from Groq API with content and usage
 */
async function callGroqApi(apiKey, systemMessage, userPrompt, rateLimiter = groqRateLimiter) {
    // Wait for rate limit before making Groq API call
    await rateLimiter.waitIfNeeded();
    // Create Groq client with API key
    const client = new groq_sdk_1.Groq({ apiKey });
    try {
        const response = await client.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: systemMessage
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            temperature: 0.3,
            max_tokens: 300
        });
        // Update rate limiter with actual token usage
        if (response.usage?.total_tokens) {
            await rateLimiter.updateTokenUsage(response.usage.total_tokens);
        }
        // Extract content
        const content = (response.choices[0]?.message?.content || '').trim();
        return {
            content,
            usage: {
                total_tokens: response.usage?.total_tokens
            }
        };
    }
    catch (error) {
        const errorStr = String(error);
        // Check if it's a rate limit error
        if (errorStr.includes('429') ||
            errorStr.toLowerCase().includes('rate_limit') ||
            errorStr.includes('Rate limit')) {
            // Try to extract wait time from error message
            let waitTime = null;
            const match = errorStr.toLowerCase().match(/try again in ([\d.]+)s/);
            if (match) {
                waitTime = parseFloat(match[1]) + 1; // Add 1 second buffer
            }
            if (waitTime) {
                console.warn(`[Groq] Rate limit exceeded. Waiting ${waitTime.toFixed(1)}s...`);
                await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitTime * 1000)));
                // Retry once after waiting
                try {
                    const client = new groq_sdk_1.Groq({ apiKey });
                    const response = await client.chat.completions.create({
                        model: 'llama-3.1-8b-instant',
                        messages: [
                            {
                                role: 'system',
                                content: systemMessage
                            },
                            {
                                role: 'user',
                                content: userPrompt
                            }
                        ],
                        temperature: 0.3,
                        max_tokens: 300
                    });
                    const content = (response.choices[0]?.message?.content || '').trim();
                    return {
                        content,
                        usage: {
                            total_tokens: response.usage?.total_tokens
                        }
                    };
                }
                catch (retryError) {
                    console.warn('[Groq] Rate limit retry failed:', retryError);
                    throw retryError;
                }
            }
            else {
                console.warn('[Groq] Rate limit exceeded after retries');
                throw error;
            }
        }
        throw error;
    }
}
/**
 * Get the global Groq rate limiter instance
 */
function getGroqRateLimiter() {
    return groqRateLimiter;
}
exports.default = {
    callGroqApi,
    getGroqRateLimiter,
    GroqRateLimiter
};
//# sourceMappingURL=groqClient.js.map