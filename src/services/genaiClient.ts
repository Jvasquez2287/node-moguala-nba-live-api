/**
 * Google GenAI API rate limiter and client wrapper.
 *
 * Handles rate limiting for Google GenAI API calls to respect RPM (Requests Per Minute) and
 * TPM (Tokens Per Minute) limits. Provides a wrapper around the Google GenAI SDK.
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Rate limiter for Google GenAI API calls to respect RPM and TPM limits
 */
class GenAIRateLimiter {
  private maxRequestsPerMinute: number;
  private maxTokensPerMinute: number;
  private tokensPerRequest: number;
  private requestHistory: number[] = [];
  private tokenHistory: Array<[number, number]> = [];
  private locked = false;

  /**
   * Initialize Google GenAI rate limiter
   *
   * @param maxRequestsPerMinute - Maximum requests per minute (default 20, conservative)
   * @param maxTokensPerMinute - Maximum tokens per minute (default 5500, conservative)
   * @param tokensPerRequest - Estimated tokens per request (default 2000)
   */
  constructor(
    maxRequestsPerMinute: number = 20,
    maxTokensPerMinute: number = 5500,
    tokensPerRequest: number = 2000
  ) {
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
  async waitIfNeeded(estimatedTokens?: number): Promise<void> {
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
      while (
        this.requestHistory.length > 0 &&
        currentTime - this.requestHistory[0] > 60
      ) {
        this.requestHistory.shift();
      }
      while (
        this.tokenHistory.length > 0 &&
        currentTime - this.tokenHistory[0][0] > 60
      ) {
        this.tokenHistory.shift();
      }

      // Calculate how many requests and tokens we've used in the last 60 seconds
      const requestsUsed = this.requestHistory.length;
      const tokensUsed = this.tokenHistory.reduce(
        (sum, [_, tokens]) => sum + tokens,
        0
      );

      let waitTime = 0;

      // Check RPM limit - wait if we're at 90% of limit
      if (
        requestsUsed >=
        Math.floor(this.maxRequestsPerMinute * 0.9)
      ) {
        if (this.requestHistory.length > 0) {
          const oldestTime = this.requestHistory[0];
          waitTime = Math.max(
            waitTime,
            60 - (currentTime - oldestTime) + 1
          );
        }
      }

      // Check TPM limit - wait if we're at 85% of limit (more conservative for tokens)
      if (
        tokensUsed + estimatedTokens >
        Math.floor(this.maxTokensPerMinute * 0.85)
      ) {
        if (this.tokenHistory.length > 0) {
          const oldestTime = this.tokenHistory[0][0];
          waitTime = Math.max(
            waitTime,
            60 - (currentTime - oldestTime) + 2
          );
        }
      }

      // Wait if needed
      if (waitTime > 0) {
        console.log(
          `[GenAI Rate Limit] Waiting ${waitTime.toFixed(1)}s ` +
          `(RPM: ${requestsUsed}/${this.maxRequestsPerMinute}, ` +
          `TPM: ${tokensUsed}/${this.maxTokensPerMinute})`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, Math.ceil(waitTime * 1000))
        );

        // Clean up again after waiting
        const newTime = Date.now() / 1000;
        while (
          this.requestHistory.length > 0 &&
          newTime - this.requestHistory[0] > 60
        ) {
          this.requestHistory.shift();
        }
        while (
          this.tokenHistory.length > 0 &&
          newTime - this.tokenHistory[0][0] > 60
        ) {
          this.tokenHistory.shift();
        }
      }

      // Record this request
      this.requestHistory.push(Date.now() / 1000);
      this.tokenHistory.push([Date.now() / 1000, estimatedTokens]);
    } finally {
      this.locked = false;
    }
  }

  /**
   * Update the last request's token count with actual usage from GenAI response
   *
   * @param actualTokens - Actual tokens used (prompt + completion)
   */
  async updateTokenUsage(actualTokens: number): Promise<void> {
    while (this.locked) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.locked = true;

    try {
      if (this.tokenHistory.length > 0) {
        const timestamp = this.tokenHistory[this.tokenHistory.length - 1][0];
        this.tokenHistory[this.tokenHistory.length - 1] = [timestamp, actualTokens];
      }
    } finally {
      this.locked = false;
    }
  }
}

// Global GenAI rate limiter instance
// Conservative limits: 20 RPM (matches Groq) and 5500 TPM (matches Groq, leaves buffer)
const genaiRateLimiter = new GenAIRateLimiter(20, 5500, 2000);

/**
 * Call Google GenAI API to generate insights
 *
 * @param apiKey - Google GenAI API key
 * @param systemMessage - System message for the LLM
 * @param userPrompt - User prompt with game data
 * @param rateLimiter - Rate limiter instance (defaults to global)
 * @returns Response from GenAI API with content and usage
 */
export async function callGenaiApi(
  apiKey: string,
  systemMessage: string,
  userPrompt: string,
  rateLimiter: GenAIRateLimiter = genaiRateLimiter
): Promise<{ content: string; usage: { total_tokens?: number } }> {
  // Wait for rate limit before making GenAI API call
  await rateLimiter.waitIfNeeded();

  // Create GenAI client with API key
  const client = new GoogleGenAI({ apiKey });

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemMessage + '\n\n' + userPrompt }
          ]
        }
      ]
    });

    // Extract token usage from response metadata
    const totalTokens = response.usageMetadata?.totalTokenCount;
    if (totalTokens) {
      await rateLimiter.updateTokenUsage(totalTokens);
    }

    // Extract content from response
    const content = (response.text || '').trim();

    return {
      content,
      usage: {
        total_tokens: totalTokens
      }
    };
  } catch (error: any) {
    const errorStr = String(error);

    // Check if it's a rate limit error
    if (
      errorStr.includes('429') ||
      errorStr.toLowerCase().includes('rate_limit') ||
      errorStr.toLowerCase().includes('too many requests') ||
      errorStr.includes('Resource has been exhausted')
    ) {
      // Try to extract wait time from error message
      let waitTime: number | null = null;
      const match = errorStr.toLowerCase().match(/retry.?after\s+([\d.]+)\s*(?:second|sec)?/);
      if (match) {
        waitTime = parseFloat(match[1]) + 1; // Add 1 second buffer
      }

      if (waitTime) {
        console.warn(
          `[GenAI] Rate limit exceeded. Waiting ${waitTime.toFixed(1)}s...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, Math.ceil(waitTime! * 1000))
        );

        // Retry once after waiting
        try {
          const client = new GoogleGenAI({ apiKey });
          const response = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemMessage + '\n\n' + userPrompt }
                ]
              }
            ]
          });

          const totalTokens = response.usageMetadata?.totalTokenCount;
          if (totalTokens) {
            await rateLimiter.updateTokenUsage(totalTokens);
          }

          const content = (response.text || '').trim();

          return {
            content,
            usage: {
              total_tokens: totalTokens
            }
          };
        } catch (retryError) {
          console.warn('[GenAI] Rate limit retry failed:', retryError);
          throw retryError;
        }
      } else {
        console.warn('[GenAI] Rate limit exceeded after retries');
        throw error;
      }
    }

    throw error;
  }
}

/**
 * Get the global GenAI rate limiter instance
 */
export function getGenaiRateLimiter(): GenAIRateLimiter {
  return genaiRateLimiter;
}

export default {
  callGenaiApi,
  getGenaiRateLimiter,
  GenAIRateLimiter
};