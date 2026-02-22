# Google GenAI Service Implementation

## Overview

The `genaiClient.ts` service has been implemented with **identical architecture to the proven Groq service**, allowing both providers to be used interchangeably for NBA game insights.

## Architecture

### Rate Limiting
- **Requests Per Minute (RPM)**: 20 (conservative limit)
- **Tokens Per Minute (TPM)**: 5500 (conservative limit)
- **RPM Threshold**: Waits at 90% (18 requests)
- **TPM Threshold**: Waits at 85% (4675 tokens)
- **Tracking**: Rolling 60-second windows with separate queues for requests and tokens

### Rate Limiter Properties
- Async lock mechanism prevents race conditions
- `waitIfNeeded()` method blocks if approaching limits
- `updateTokenUsage()` method updates token count with actual API response usage
- Conservative thresholds preserve API reliability

## Usage

### Single Game Insights
```typescript
import { callGenaiApi } from './services/genaiClient';
import { getSystemMessage, buildInsightPrompt } from './services/genaiPrompts';

const systemMessage = getSystemMessage();
const userPrompt = buildInsightPrompt({
  homeTeamName: 'Lakers',
  awayTeamName: 'Celtics',
  homeWinProbPct: 65.5,
  awayWinProbPct: 34.5,
  predictedHomeScore: 115,
  predictedAwayScore: 108,
  netRatingDiffStr: '(Lakers: +5.2, Celtics: +2.1)'
});

const response = await callGenaiApi(
  process.env.GENAI_API_KEY || '',
  systemMessage,
  userPrompt
);

console.log(response.content); // JSON array of insights
console.log(response.usage.total_tokens); // Token count for rate limiting
```

### Batched Multi-Game Insights
```typescript
import { callGenaiApi } from './services/genaiClient';
import { 
  getBatchedInsightsSystemMessage, 
  buildBatchedInsightsPrompt 
} from './services/genaiPrompts';

const systemMessage = getBatchedInsightsSystemMessage();
const userPrompt = buildBatchedInsightsPrompt(games);

const response = await callGenaiApi(
  process.env.GENAI_API_KEY || '',
  systemMessage,
  userPrompt
);

// Response: { timestamp, insights: [{ game_id, type, text }] }
```

### With Custom Rate Limiter
```typescript
import { callGenaiApi, GenAIRateLimiter } from './services/genaiClient';

const customLimiter = new GenAIRateLimiter(30, 6000, 2000);

const response = await callGenaiApi(
  apiKey,
  systemMessage,
  userPrompt,
  customLimiter // Use custom limits instead of global
);
```

## API Response Structure

### Success Response
```typescript
{
  content: '[{"title":"insight",description":"explanation"}]', // JSON string
  usage: {
    total_tokens: 342
  }
}
```

### Error Handling
- **Rate Limit (429)**: Automatically waits and retries once
- **Other Errors**: Thrown with error details for caller to handle
- **Console Logging**: `[GenAI]` prefix for identified debug messages

## Model Configuration

- **Model**: `gemini-2.0-flash` (Google's fastest model)
- **Temperature**: 0.3 (deterministic, consistent insights)
- **Token Format**: System message + user prompt combined

## Integration with Predictions Service

Current predictions service uses Groq. To add GenAI as fallback:

```typescript
// src/services/predictions.ts
import { callGroqApi } from './groqClient';
import { callGenaiApi } from './genaiClient';

// Try Groq first, fallback to GenAI
let response;
try {
  response = await callGroqApi(apiKey, systemMessage, prompt);
} catch (error) {
  console.log('Groq failed, trying GenAI...');
  response = await callGenaiApi(apiKey, systemMessage, prompt);
}
```

Or implement provider selection logic:

```typescript
const provider = process.env.INSIGHTS_PROVIDER || 'groq';
const callApi = provider === 'genai' ? callGenaiApi : callGroqApi;

const response = await callApi(apiKey, systemMessage, prompt);
```

## Comparison: Groq vs GenAI

| Feature | Groq | GenAI |
|---------|------|-------|
| Rate Limit Import | `callGroqApi` | `callGenaiApi` |
| Rate Limiter | `GroqRateLimiter` | `GenAIRateLimiter` |
| Model | `llama-3.1-8b-instant` | `gemini-2.0-flash` |
| RPM Limit | 20 | 20 |
| TPM Limit | 5500 | 5500 |
| Prompt Format | System + User messages | System + User messages (combined) |
| Response Field | `choices[0].message.content` | `text` |
| Usage Field | `usage.total_tokens` | `usageMetadata.totalTokenCount` |
| Error Handling | 429 detection | 429 + Resource exhausted detection |

## Configuration

### Environment Variables
```bash
GENAI_API_KEY=your_google_genai_api_key
GROQ_API_KEY=your_groq_api_key
INSIGHTS_PROVIDER=genai  # or 'groq' (optional)
```

### Rate Limiter Global Instance
The service creates a global rate limiter instance with conservative limits:
```typescript
const genaiRateLimiter = new GenAIRateLimiter(20, 5500, 2000);
```

Each call to `callGenaiApi()` uses this global instance by default, ensuring rate limits are respected across the entire application.

## Status

✅ **Implemented**: Full genaiClient.ts with rate limiting  
✅ **Tested**: TypeScript compilation verified  
✅ **Ready**: Can be integrated into predictions service  
✅ **Architecture**: Identical to Groq for maintainability  

## Next Steps

1. **Fallback Logic**: Add GenAI as fallback provider in predictions service
2. **Provider Selection**: Implement env var or configuration for provider choice
3. **Testing**: Test both single and batched insight generation
4. **Monitoring**: Add metrics to track GenAI vs Groq usage and performance
