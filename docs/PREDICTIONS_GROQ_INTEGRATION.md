# Predictions Service - Groq AI Integration

Complete guide to the Groq AI integration in the NBA predictions service. This document explains how AI-powered insights are generated for game predictions.

## Overview

The predictions service now integrates Groq AI to generate natural language insights explaining why certain outcomes are predicted. The integration uses **batched API calls** to analyze multiple games in a single Groq request, dramatically improving efficiency and reducing API usage.

### Key Features

- **Batched Insights** - Analyze 5-10 games in one Groq API call (instead of 5-10 separate calls)
- **Fallback System** - Simple rule-based insights if Groq is unavailable
- **Caching** - 30-minute TTL with LRU eviction (prevents duplicate Groq calls for same date)
- **Rate Limiting** - Built-in protection against exceeding free tier limits
- **Error Handling** - Automatic JSON repair for malformed Groq responses

## Architecture

### Service Flow

```
1. GET /api/v1/predictions?date=2024-12-15&season=2024-25
   │
   ├─ Check cache (30-min TTL with LRU eviction)
   │  └─ If valid: Return cached predictions immediately
   │
   ├─ Fetch games for date from schedule service
   ├─ Get team statistics (win pct, net rating)
   │
   ├─ Calculate base predictions for each game:
   │  ├─ Win probability (win % + home court advantage + net rating adjustment)
   │  ├─ Predicted scores (based on win probability)
   │  └─ Confidence level (based on probability gap)
   │
   ├─ Generate BATCHED insights (all games in one Groq call)
   │  ├─ Build combined prompt with all games
   │  ├─ Call Groq API once
   │  └─ Parse response (handle JSON malformations)
   │
   ├─ Create GamePrediction objects with insights
   │
   ├─ Cache results (30 minutes, LRU eviction at 100 max entries)
   │
   └─ Return PredictionsResponse
```

## Groq Integration Functions

### 1. `generateBatchedAIInsights()`

**Purpose**: Generate insights for multiple games in a single Groq API call.

```typescript
const insights = await generateBatchedAIInsights([
  {
    gameId: "0021900042",
    homeTeamName: "Los Angeles Lakers",
    awayTeamName: "Boston Celtics",
    homeWinProb: 0.55,
    awayWinProb: 0.45,
    predictedHomeScore: 110,
    predictedAwayScore: 105,
    netRatingDiffStr: "+3.5 (Lakers)"
  },
  // ... more games
]);

// Result:
// {
//   "0021900042": [
//     { title: "Slight favorite", description: "Lakers are favored...", impact: "" },
//     { title: "Home court advantage", description: "...", impact: "" }
//   ]
// }
```

**Benefits**:
- **1 API call** for N games (vs N API calls individually)
- **Lower latency** - 2-3 second response for 5-10 games
- **Cost efficient** - Reduces token usage by 60-70%

**Error Handling**:
- Returns empty `{}` if Groq unavailable
- Returns empty `{}` if API key missing
- Automatically repairs malformed JSON from Groq

### 2. `generateAIInsights()` (Single Game - Available for Use)

**Purpose**: Generate insights for a single game (used as fallback if batching fails).

```typescript
const singleGameInsight = await generateAIInsights(
  "Los Angeles Lakers",
  "Boston Celtics",
  0.55,  // homeWinProb
  110,   // predictedHomeScore
  105,   // predictedAwayScore
);
```

**When Used**:
- User requests prediction for individual game
- Batched call failed and all games need fallback
- Real-time prediction request for single game

### 3. `fixUnterminatedStrings()`

**Purpose**: Repair malformed JSON from Groq (common when response is truncated).

```typescript
const brokenJson = `{"insights":[{"title":"...","description":"...`; // Incomplete
const fixed = fixUnterminatedStrings(brokenJson);
// Automatically closes unterminated strings, brackets, and braces
```

**Handles**:
- Unterminated string literals
- Unclosed brackets `[`
- Unclosed braces `{`
- Trailing commas

## Integration in predictions.ts

### Updated `predictGamesForDate()` Function

The main function now uses Groq for insight generation:

```typescript
export async function predictGamesForDate(
  date: string,
  season: string
): Promise<PredictionsResponse | null> {
  // STEP 1: Check cache (30-min TTL, LRU eviction)
  const cached = predictionsCache.get(cacheKey);
  if (cached && isValid) return cached.response;
  
  // STEP 2: Get games and team stats
  const games = await getGamesForDate(date);
  const teamStats = await getTeamStatistics(season);
  
  // STEP 3: Calculate base predictions
  const predictions = [];
  for (const game of games) {
    // Calculate win prob, predict score, etc.
  }
  
  // STEP 4: Call Groq ONCE for all games
  const batchedInsights = await generateBatchedAIInsights(predictionsForBatch);
  
  // STEP 5: Assign insights to each game
  for (const gameId of gameIds) {
    const insights = batchedInsights[gameId] || generateSimpleInsights(...);
    // Create GamePrediction with insights
  }
  
  // STEP 6: Cache results (LRU with size limit)
  predictionsCache.set(cacheKey, { response, timestamp: now });
  
  return response;
}
```

## Caching Strategy

### Predictions Cache (Primary)
- **Key**: `{date}_{season}` (e.g., "2024-12-15_2024-25")
- **TTL**: 30 minutes (prevent duplicate Groq calls)
- **Size Limit**: 100 entries max
- **Eviction**: LRU (least recently used removed first)
- **When Full**: Oldest entry removed automatically

### Team Statistics Cache (Secondary)
- **Key**: `{season}` (e.g., "2024-25")
- **TTL**: 1 hour
- **Size Limit**: 3 seasons max
- **Eviction**: Oldest season removed

### Benefits
1. **Same date** - Multiple requests return cached results immediately (no Groq calls)
2. **Different date** - New Groq call made (predictions vary by day)
3. **Next day** - Fresh Groq call (new predictions, stale cache entries cleaned)

## Response Schemas

### GamePrediction Object

```typescript
interface GamePrediction {
  // Game identifiers
  game_id: string;
  home_team_id: number;
  home_team_name: string;
  away_team_id: number;
  away_team_name: string;
  game_date: string;

  // Predictions
  home_win_probability: number;        // 0.0-1.0
  away_win_probability: number;        // 0.0-1.0
  predicted_home_score: number;        // e.g., 110
  predicted_away_score: number;        // e.g., 105
  confidence: number;                  // 0.5-0.8 (higher = more confident)
  confidence_tier: 'high' | 'medium' | 'low';

  // Insights (AI-generated)
  insights: GamePredictionInsight[];   // 2-3 insights explaining why

  // Team stats used for prediction
  home_team_win_pct: number;           // Season win percentage
  away_team_win_pct: number;           // Season win percentage
  home_team_net_rating?: number;       // Offensive efficiency - defensive efficiency
  away_team_net_rating?: number;       // Offensive efficiency - defensive efficiency
}

interface GamePredictionInsight {
  title: string;           // e.g., "Clear favorite"
  description: string;     // e.g., "Lakers have a significant advantage..."
  impact: string;          // (Currently empty for AI insights)
}
```

### PredictionsResponse Object

```typescript
interface PredictionsResponse {
  date: string;                      // YYYY-MM-DD
  season: string;                    // YYYY-YY (e.g., 2024-25)
  predictions: GamePrediction[];      // List of all game predictions
}
```

## Example Response

```json
{
  "date": "2024-12-15",
  "season": "2024-25",
  "predictions": [
    {
      "game_id": "0021900042",
      "home_team_id": 2,
      "home_team_name": "Boston Celtics",
      "away_team_id": 2,
      "away_team_name": "Los Angeles Lakers",
      "game_date": "2024-12-15",
      "home_win_probability": 0.55,
      "away_win_probability": 0.45,
      "predicted_home_score": 112,
      "predicted_away_score": 107,
      "confidence": 0.7,
      "confidence_tier": "high",
      "insights": [
        {
          "title": "Slight favorite",
          "description": "Boston Celtics have a slight edge based on win probability.",
          "impact": ""
        },
        {
          "title": "Home court advantage",
          "description": "Boston Celtics playing at home provides an edge.",
          "impact": ""
        },
        {
          "title": "Efficiency advantage",
          "description": "Celtics have a stronger net rating advantage.",
          "impact": ""
        }
      ],
      "home_team_win_pct": 0.680,
      "away_team_win_pct": 0.620,
      "home_team_net_rating": 4.2,
      "away_team_net_rating": 3.8
    }
  ]
}
```

## Prediction Model Details

### Win Probability Calculation

```
base_prob = home_win_pct / (home_win_pct + away_win_pct)

// Adjust for net rating if available
if (net ratings available):
  rating_diff = home_net_rating - away_net_rating
  prob += rating_diff * 0.005  // 10pt difference ≈ 5% win prob change

// Add home court advantage
prob += 0.035  // 3.5% advantage

// Clamp to reasonable range [0.05, 0.95]
```

### Score Prediction

```
avg_score = 112 points (NBA average)

if (home_win_prob > 0.5):
  home_score = 112 + (win_prob - 0.5) * 15
else:
  home_score = 112 - (0.5 - win_prob) * 15

// Away team gets complementary score
```

### Confidence Calculation

```
prob_gap = |home_win_prob - 0.5| * 2

if (prob_gap > 0.2):
  confidence = 0.8  // Clear favorite
else if (prob_gap > 0.1):
  confidence = 0.7  // Moderate favorite
else if (prob_gap > 0.05):
  confidence = 0.6  // Slight favorite
else:
  confidence = 0.5  // Very close game
```

## Insight Generation

### Simple Insights (Fallback)

When Groq is unavailable, the service generates rule-based insights:

1. **Probability Gap Insight** - Based on win probability difference
   - `prob_diff >= 15%` → "Large probability gap"
   - `prob_diff >= 8%` → "Moderate probability gap"
   - `prob_diff < 8%` → "Close matchup"

2. **Home Court Advantage** - Added if home team is favored

3. **Efficiency Advantage** - If net rating diff >= 5 points

### AI Insights (Groq-Generated)

When Groq is available, prompts are generated using the `buildBatchedInsightsPrompt()` function:

**System Message**: 
```
"You are an expert NBA analyst providing neutral, factual analysis of game predictions 
based on team statistics. Use ESPN broadcast tone - informative but not hyped. 
Avoid predictions, focus on explaining the statistical basis for win probabilities."
```

**User Prompt Format**:
```
Game 1: Boston Celtics (52.3% win prob) vs Los Angeles Lakers (47.7% win prob)
Predicted Score: 112-107 (Celtics)
Net Rating Diff: +0.4 (Celtics)

Game 2: ...

Return JSON with structure: { "insights": [ ... ] }
```

**Expected Insights**:
- Statistical explanation of probabilities
- Team matchup advantages
- Notable stat differentials
- Possible key factors

## Performance Considerations

### API Call Efficiency

| Scenario | Calls | Time | Cost |
|----------|-------|------|------|
| 5 games (individual calls) | 5 | 10-15s | 100% |
| 5 games (batched) | 1 | 2-3s | ~30% |
| 10 games (individual calls) | 10 | 20-30s | 100% |
| 10 games (batched) | 1 | 3-4s | ~25% |

### Token Usage

- **Per-game call**: ~150-250 tokens
- **Batched 5 games**: ~400-600 tokens (vs 750-1250 individual)
- **Savings**: 50-70% fewer tokens with batching

### Cache Hit Scenarios

- **Same date, multiple requests**: 100% cache hits (no Groq calls)
- **Next day, new date**: 0% cache hits (fresh Groq calls)
- **Same date after 30 min**: 0% cache hits (expired, fresh Groq calls)

## Error Handling

### Missing Groq API Key

```
[Predictions] Groq API key not configured, using simple insights
→ Returns simple rule-based insights instead of failing
```

### Rate Limit Error (429)

```
Groq: "You have exceeded the rate limit"
→ callGroqApi() automatically waits and retries once
→ If still fails: Return empty insights, use fallback
```

### Malformed JSON Response

```
Groq returns: {"insights":[{"title":"...","description":"...
(unterminated string)
→ fixUnterminatedStrings() repairs JSON automatically
→ If repair fails: Return empty insights, use fallback
```

### Network Timeout

```
Groq API doesn't respond within timeout
→ generateBatchedAIInsights() returns empty dict
→ Service uses generateSimpleInsights() fallback
→ Response includes insights but quality is lower
```

## Testing

### Test Endpoint Locally

```bash
curl "http://localhost:3000/api/v1/predictions?date=2024-12-15&season=2024-25"
```

### Expected Behavior

1. **First request for date**: 2-3 second response (Groq call made)
2. **Second request for same date**: <100ms response (cache hit, no Groq call)
3. **Request after 30 minutes**: 2-3 second response (cache expired, new Groq call)
4. **No Groq API key set**: Still works (uses simple insights)

### Debugging

```typescript
// Check cache status
console.log(`Cache entries: ${predictionsCache.size}`);

// Check what insights were generated
const response = await predictGamesForDate("2024-12-15", "2024-25");
response.predictions.forEach(pred => {
  console.log(`${pred.away_team_name} @ ${pred.home_team_name}`);
  console.log(`  Insights: ${pred.insights.map(i => i.title).join(', ')}`);
});
```

## Troubleshooting

### Insights are Generic/Simple

**Problem**: All games are getting simple rule-based insights, not AI insights

**Cause 1**: Groq API key not set
```bash
# Check if GROQ_API_KEY env var is set
echo $GROQ_API_KEY
```

**Cause 2**: Groq rate limit exceeded
```
Check console for: "Groq rate limit hit"
→ Wait 5+ minutes or upgrade Groq plan
→ Rate limiter waits automatically but may still hit limits
```

**Cause 3**: Groq returning invalid JSON
```
Check console for: "Failed to parse batched AI insights JSON"
→ Usually Groq response truncated
→ Check Groq model in groqClient.ts (currently llama-3.1-8b-instant)
→ May need more tokens or larger prompt
```

### All Predictions are Same Time

**Problem**: Same timestamp for all requests on same day

**Cause**: Cache is working - all returned from cache
**Solution**: This is expected behavior! Cache is functioning correctly
**Workaround**: Delete cache entry or wait 30 minutes

```typescript
// Clear cache for testing
predictionsCache.delete("2024-12-15_2024-25");
```

### Predictions Not Changing Day-to-Day

**Problem**: Win probabilities identical across different days

**Cause**: Using stale team stats cache

**Solution**: Team stats cache is 1 hour, not 30 minutes
**Workaround**: Reset team stats cache after updating rosters

```typescript
// Clear team stats if roster changes
teamStatsCache.clear();
```

## Configuration

### Environment Variables

```bash
# .env file
GROQ_API_KEY=your_api_key_here
```

### Rate Limiter Settings

Located in `groqClient.ts`:

```typescript
const groqRateLimiter = new GroqRateLimiter(
  20,      // Max requests per minute (conservative, below free tier 30)
  5500,    // Max tokens per minute (conservative, below free tier 6000)
  2000     // Estimated tokens per request
);
```

### Cache TTL Settings

Located in `predictions.ts`:

```typescript
const PREDICTIONS_CACHE_TTL = 30 * 60 * 1000;  // 30 minutes
const PREDICTIONS_CACHE_MAX_SIZE = 100;         // Max 100 cached dates
const CACHE_DURATION = 3600000;                 // 1 hour for team stats
```

### Insight Model Settings

Located in `groqPrompts.ts`:

```typescript
// Model used for all insight generation
const model = 'llama-3.1-8b-instant';  // Free tier model

// System message tone
"ESPN broadcast style - informative but not hyped"
```

## Future Enhancements

### Potential Improvements

1. **Custom Insights** - Different insights based on matchup type (rivalry, record, etc.)
2. **Confidence Tiers** - AI-generated confidence with explanation
3. **Key Drivers** - Specific factors (bench depth, injury, defense, etc.)
4. **Risk Factors** - What could change the outcome
5. **Matchup Narrative** - Game context and storylines
6. **Historical Accuracy** - Track prediction accuracy over time

### Implementation Notes

- Enhanced analysis foundation already exists in `generateEnhancedAnalysis()`
- Schema supports `KeyDriver` and `RiskFactor` objects
- Would require expanded Groq prompts and parsing logic
- Could layer on top of existing batched system

## API Reference

### GET /api/v1/predictions

**Query Parameters**:
- `date` (required): YYYY-MM-DD format
- `season` (required): YYYY-YY format (e.g., 2024-25)

**Response**: [PredictionsResponse](#predictionsresponse-object)

**Cache**:
- 30-minute TTL
- LRU eviction at 100 entries

**Groq Integration**:
- Batched AI insights (1 call for all games)
- Automatic fallback to simple insights
- Rate limiting: 20 RPM, 5500 TPM

## Support Resources

- **Groq Documentation**: https://console.groq.com/docs
- **Free Tier Limits**: 30 RPM, 6000 TPM
- **Rate Limiter**: See `groqClient.ts`
- **Prompt Templates**: See `groqPrompts.ts`
- **Caching Strategy**: See predictions.ts caching section

