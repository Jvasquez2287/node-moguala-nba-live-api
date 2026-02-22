# Groq AI Services Documentation

Complete guide to using the Groq AI services for NBA game insights, live analysis, and key moment explanations.

## Overview

The Groq services provide three core modules for integrating AI-powered insights into the NBA API:

1. **groqClient.ts** - Rate limiter and API wrapper for Groq calls
2. **groqBatcher.ts** - Generic batching pattern for efficient API calls
3. **groqPrompts.ts** - Prompt generation for various NBA AI tasks

These services are designed to be **reusable**, **efficient**, and **production-ready** with built-in rate limiting and caching.

---

## 1. Groq Client (`groqClient.ts`)

### Purpose
Provides a wrapper around the Groq SDK with intelligent rate limiting to respect API limits:
- **RPM (Requests Per Minute)**: 20 requests/minute (conservative, below free tier limit of 30)
- **TPM (Tokens Per Minute)**: 5500 tokens/minute (below free tier limit of 6000)

### Key Components

#### GroqRateLimiter Class

```typescript
const rateLimiter = new GroqRateLimiter(
  maxRequestsPerMinute = 20,
  maxTokensPerMinute = 5500,
  tokensPerRequest = 2000
);

await rateLimiter.waitIfNeeded(estimatedTokens?: number);
await rateLimiter.updateTokenUsage(actualTokens: number);
```

**Features**:
- Automatic waiting when approaching rate limits
- Rolling 60-second window tracking
- Token usage updates from actual Groq responses
- Thread-safe with async lock mechanism

#### callGroqApi() Function

```typescript
const response = await callGroqApi(
  apiKey: string,
  systemMessage: string,
  userPrompt: string,
  rateLimiter?: GroqRateLimiter
): Promise<{ content: string; usage: { total_tokens?: number } }>
```

**Parameters**:
- `apiKey` - Groq API key (from `GROQ_API_KEY` env var)
- `systemMessage` - System prompt (behavior instructions)
- `userPrompt` - User prompt (data + task)
- `rateLimiter` - Optional custom rate limiter (defaults to global instance)

**Returns**:
```typescript
{
  content: string,        // Raw text response from Groq
  usage: {
    total_tokens?: number // Total tokens used
  }
}
```

**Error Handling**:
- Catches rate limit errors (429)
- Extracts wait time from error message
- Automatically retries after waiting
- Re-throws other errors for caller to handle

### Usage Example

```typescript
import { callGroqApi } from './services/groqClient';

try {
  const response = await callGroqApi(
    process.env.GROQ_API_KEY!,
    'You are an NBA analyst.',
    'Analyze this game: Lakers vs Celtics 105-98...',
  );
  
  console.log(response.content);  // AI-generated analysis
  console.log(response.usage.total_tokens);  // Token count
} catch (error) {
  console.error('Groq call failed:', error);
}
```

### Best Practices

✅ **DO**:
- Use the global rate limiter for consistency
- Let the rate limiter wait automatically
- Update token usage on each call
- Batch multiple requests into one API call

❌ **DON'T**:
- Call Groq directly without rate limiting
- Make multiple API calls when one batched call works
- Ignore rate limit errors
- Set rate limits too high (check Groq's free tier)

---

## 2. Groq Batcher (`groqBatcher.ts`)

### Purpose
Provides a reusable pattern for batching multiple items into a single Groq API call, dramatically improving efficiency and reducing API costs.

Instead of:
```
Call Groq → 10 games → 10 API calls
```

Use batching:
```
Call Groq → 10 games → 1 API call
```

### Key Components

#### generateBatchedGroqResponses() Function

```typescript
const results = await generateBatchedGroqResponses<T, R>({
  items: T[],
  buildPromptFn: (items: T[]) => string,
  getSystemMessageFn: () => string,
  parseResponseFn: (response: Record<string, any>) => Record<string, R>,
  cacheKeyFn?: (items: T[]) => string,
  cacheTtl?: number,
  timeout?: number,
  emptyResult?: Record<string, R>,
}): Promise<Record<string, R>>
```

**Parameters**:
- `items` - Array of items to process
- `buildPromptFn` - Function to build prompt from items
- `getSystemMessageFn` - Function to get system message
- `parseResponseFn` - Function to parse Groq JSON response
- `cacheKeyFn` - Optional function to generate cache key (enables caching)
- `cacheTtl` - Cache time-to-live in seconds (default 60)
- `timeout` - API call timeout in seconds (default 10)
- `emptyResult` - Default return value if generation fails

**Returns**:
```typescript
Record<string, R>  // Map of item_id -> result
```

### Caching Strategy

The batcher includes built-in caching:
- **Max items**: 1000 cached responses
- **TTL**: 1 hour (expired entries cleaned up)
- **LRU Eviction**: When cache is full, oldest entries are removed
- **Auto Cleanup**: Triggered when cache reaches 90% capacity

### Usage Example

```typescript
import { generateBatchedGroqResponses } from './services/groqBatcher';
import { 
  getBatchedInsightsSystemMessage,
  buildBatchedInsightsPrompt 
} from './services/groqPrompts';

// Generate insights for multiple games in one API call
const results = await generateBatchedGroqResponses({
  items: liveGames,
  
  buildPromptFn: (games) => 
    buildBatchedInsightsPrompt(games),
  
  getSystemMessageFn: () => 
    getBatchedInsightsSystemMessage(),
  
  parseResponseFn: (response) => {
    // response.insights is array of game insights
    const result: Record<string, any> = {};
    for (const insight of response.insights) {
      result[insight.game_id] = insight;
    }
    return result;
  },
  
  cacheKeyFn: (games) => {
    // Create cache key from game IDs
    return games.map(g => g.gameId).sort().join('_');
  },
  
  cacheTtl: 60,  // Cache for 1 minute
  timeout: 10    // 10 second timeout
});

// results = {
//   "game_1": { type: "momentum", text: "..." },
//   "game_2": { type: "lead_change", text: "..." }
// }
```

### Cache Management

```typescript
import { clearBatchCache } from './services/groqBatcher';

// Clear all cached responses (useful for testing)
clearBatchCache();
```

### Best Practices

✅ **DO**:
- Always provide a `cacheKeyFn` when results are deterministic
- Set reasonable `cacheTtl` values (60-300 seconds typical)
- Include timeout to prevent hanging
- Batch related items together

❌ **DON'T**:
- Make cache keys that are too long (limit to ~100 chars)
- Use very short TTL (<10 seconds) unless data changes rapidly
- Batch unrelated items (hurts prompt quality)
- Call Groq directly for repetitive operations

---

## 3. Groq Prompts (`groqPrompts.ts`)

### Purpose
Provides prompt generation functions for various NBA AI tasks. These functions handle:
- System message generation
- Prompt building with proper formatting
- Data validation and context injection
- Output format specification

### System Messages

#### General Analysis
```typescript
getSystemMessage(): string
```
General-purpose system message for game analysis.

#### Live Game Analysis
```typescript
getLiveGameSystemMessage(): string
```
System message for real-time game insights.

#### Batched Analysis
```typescript
getBatchedInsightsSystemMessage(): string
```
System message for analyzing multiple games at once.

#### Key Moment Context
```typescript
getKeyMomentSystemMessage(): string
```
System message for explaining why a moment matters.

#### Batched Moment Analysis
```typescript
getBatchedMomentContextSystemMessage(): string
```
System message for batch moment explanation.

### Prompt Builders

#### Game Prediction Insights
```typescript
const prompt = buildInsightPrompt({
  homeTeamName: "Los Angeles Lakers",
  awayTeamName: "Boston Celtics",
  homeWinProbPct: 55.2,
  awayWinProbPct: 44.8,
  predictedHomeScore: 108,
  predictedAwayScore: 102,
  netRatingDiffStr?: "+3.5 (Lakers)"
});

const response = await callGroqApi(
  apiKey,
  getSystemMessage(),
  prompt
);
```

**Returns**: Prompt with:
- Probability analysis
- Score interpretation
- Context for neutrality
- Output format (JSON array)

#### Live Game Insights
```typescript
const prompt = buildLiveGameInsightPrompt({
  homeTeam: "New York Knicks",
  awayTeam: "Miami Heat",
  homeScore: 58,
  awayScore: 62,
  period: 2,
  clock: "08:45",
  lastThreePlays: [
    "Miami: Guard made 3PT shot",
    "New York: Turnover",
    "Miami: Fast break layup"
  ],
  topPerformer?: "Jimmy Butler: 15 pts, 4 ast",
  triggerType?: "momentum"
});
```

**Trigger Types**: `score_change`, `period_change`, `timeout`, `momentum`, `end_of_quarter`, `overtime`

#### Batched Game Insights
```typescript
const prompt = buildBatchedInsightsPrompt(liveGames);

// liveGames = [{
//   game_id: "...",
//   home_team: "...",
//   away_team: "...",
//   home_score: 0,
//   away_score: 0,
//   quarter: 1,
//   time_remaining: "",
//   win_prob_home: 0.5,
//   win_prob_away: 0.5,
//   last_event: ""
// }]
```

#### Key Moment Context
```typescript
const prompt = buildKeyMomentContextPrompt({
  momentType: "game_tying_shot",
  gameInfo: {
    homeTeam: "Lakers",
    awayTeam: "Celtics",
    homeScore: 98,
    awayScore: 98,
    period: 4,
    clock: "01:23"
  },
  play: {
    teamTricode: "LAL",
    playerName: "LeBron James",
    actionType: "3pt shot",
    description: "LeBron James made 3PT shot"
  }
});
```

**Moment Types**: 
- `game_tying_shot` - Shot that tied the game
- `lead_change` - Play that changed lead
- `scoring_run` - 6+ points in succession
- `clutch_play` - Final minutes, close game
- `big_shot` - Impactful 3-pointer

#### Batched Moment Context
```typescript
const prompt = buildBatchedMomentContextPrompt([
  {
    momentId: "moment_1",
    moment: { type: "game_tying_shot", play: {...} },
    gameInfo: { homeTeam: "...", ... }
  },
  {
    momentId: "moment_2",
    moment: { type: "lead_change", play: {...} },
    gameInfo: { homeTeam: "...", ... }
  }
]);
```

### Using Prompts with Batcher

```typescript
import { generateBatchedGroqResponses } from './services/groqBatcher';
import {
  getBatchedInsightsSystemMessage,
  buildBatchedInsightsPrompt
} from './services/groqPrompts';

// For live game insights
const insightResults = await generateBatchedGroqResponses({
  items: liveGames,
  buildPromptFn: buildBatchedInsightsPrompt,
  getSystemMessageFn: getBatchedInsightsSystemMessage,
  parseResponseFn: (response) => {
    const result: Record<string, any> = {};
    for (const insight of response.insights) {
      result[insight.game_id] = insight;
    }
    return result;
  }
});

// For key moment context
const momentResults = await generateBatchedGroqResponses({
  items: momentsNeedingContext,
  buildPromptFn: buildBatchedMomentContextPrompt,
  getSystemMessageFn: getBatchedMomentContextSystemMessage,
  parseResponseFn: (response) => {
    const result: Record<string, string> = {};
    for (const context of response.contexts) {
      result[context.moment_id] = context.context;
    }
    return result;
  }
});
```

---

## Complete End-to-End Example

### Scenario: Generate AI insights for all live NBA games

```typescript
import { webSocketManager } from './websocketManager';
import { dataCache } from './dataCache';
import { generateBatchedGroqResponses } from './services/groqBatcher';
import {
  getBatchedInsightsSystemMessage,
  buildBatchedInsightsPrompt
} from './services/groqPrompts';

async function generateLiveGameInsights() {
  try {
    // Get all live games
    const scoreboardData = await dataCache.getScoreboard();
    const liveGames = scoreboardData?.scoreboard?.games
      .filter((game: any) => game.gameStatus === 2)  // Status 2 = Live
      .map((game: any) => ({
        game_id: game.gameId,
        home_team: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
        away_team: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
        home_score: game.homeTeam.score,
        away_score: game.awayTeam.score,
        quarter: game.period,
        time_remaining: game.gameClock,
        win_prob_home: game.homeTeam.winProb,
        win_prob_away: game.awayTeam.winProb,
        last_event: game.gameStatusText
      })) || [];

    if (liveGames.length === 0) {
      console.log('No live games');
      return;
    }

    // Generate insights using batching (1 API call for all games)
    const insights = await generateBatchedGroqResponses({
      items: liveGames,
      
      buildPromptFn: buildBatchedInsightsPrompt,
      
      getSystemMessageFn: getBatchedInsightsSystemMessage,
      
      parseResponseFn: (response) => {
        // Parse Groq response
        const result: Record<string, any> = {};
        if (response.insights) {
          for (const insight of response.insights) {
            result[insight.game_id] = {
              type: insight.type,
              text: insight.text
            };
          }
        }
        return result;
      },
      
      cacheKeyFn: (games) => {
        // Cache key based on game IDs and current time bucket
        const timeSlot = Math.floor(Date.now() / 60000);  // 1-minute buckets
        return `insights_${games.map(g => g.game_id).sort().join('_')}_${timeSlot}`;
      },
      
      cacheTtl: 30,  // Cache for 30 seconds (live game data)
      timeout: 10
    });

    // Broadcast insights to WebSocket clients
    await webSocketManager.broadcastToAllClientsScoreBoard({
      type: 'insights',
      insights: insights,
      timestamp: new Date().toISOString()
    });

    console.log(`[Insights] Generated for ${Object.keys(insights).length} games`);
    
  } catch (error) {
    console.error('[Insights] Error generating insights:', error);
  }
}

// Run every 30 seconds
setInterval(generateLiveGameInsights, 30000);
```

---

## Performance Considerations

### Rate Limiting
- **20 requests/minute** = 1 request every 3 seconds
- Each batched call = 1 request (regardless of items count)
- Batching is **essential** for high-volume operations

### Caching
- **Default cache**: 1000 items, 1 hour TTL
- **Batching cache**: Deterministic prompts benefit most
- **Set TTL based on data freshness**:
  - Predictions: 60-300 seconds (relatively stable)
  - Live insights: 30-60 seconds (rapidly changing)
  - Key moments: 600+ seconds (rarely changes)

### Token Usage
- **Average game insight**: ~500 tokens
- **10 games batched**: ~1500-2000 tokens (much less than 10 × 500)
- **Cost**: ~$0.0001 per game insight with batching

---

## Troubleshooting

### Rate Limit Error (429)
```
Service catches and automatically retries with exponential backoff
```

### JSON Parse Error
```
Check response has ```json code blocks - batcher removes them automatically
```

### Timeout Errors
- Increase `timeout` parameter
- Reduce number of items per batch
- Check network connection to Groq API

### Low Quality Insights
- Improve `buildPromptFn` function
- Add more context to prompts
- Check system message is appropriate
- Review Groq model selection (currently using `llama-3.1-8b-instant`)

---

## Integration Checklist

Before using in production:

- [ ] Set `GROQ_API_KEY` environment variable
- [ ] Test rate limiting with local calls
- [ ] Implement caching for your use case
- [ ] Set appropriate cache TTL values
- [ ] Add error handling for API failures
- [ ] Monitor token usage in Groq dashboard
- [ ] Test timeout values for your network
- [ ] Implement request logging for debugging
- [ ] Add telemetry for cache hit rates
- [ ] Document your custom prompt functions

---

## API Reference Quick Links

| Function | Module | Purpose |
|----------|--------|---------|
| `callGroqApi()` | groqClient.ts | Call Groq with rate limiting |
| `generateBatchedGroqResponses()` | groqBatcher.ts | Batch multiple items |
| `getSystemMessage()` | groqPrompts.ts | General system prompt |
| `buildInsightPrompt()` | groqPrompts.ts | Game prediction insights |
| `buildLiveGameInsightPrompt()` | groqPrompts.ts | Live game analysis |
| `buildBatchedInsightsPrompt()` | groqPrompts.ts | Multiple games analysis |
| `buildKeyMomentContextPrompt()` | groqPrompts.ts | Moment explanation |
| `buildBatchedMomentContextPrompt()` | groqPrompts.ts | Batch moment analysis |

---

## Support Resources

- **Groq Documentation**: https://console.groq.com/docs
- **Free Tier Limits**: 30 RPM, 6000 TPM (llama-3.1-8b-instant)
- **Rate Limiter Config**: See `GroqRateLimiter` in groqClient.ts
- **Example Usage**: See `/src/services/keyMoments.ts` for integration example

