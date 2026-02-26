/**
 * Predictions service for NBA data operations.
 * Handles game outcome predictions based on team statistics with AI insights.
 */

import axios from 'axios';
import { PredictionsResponse, GamePrediction, GamePredictionInsight, KeyDriver, RiskFactor } from '../schemas/predictions';
import { getGamesForDate } from '../services/schedule';
import { dataCache } from '../services/dataCache';
import { callGroqApi } from './groqClient';
import {
    getSystemMessage,
    buildInsightPrompt,
    getBatchedInsightsSystemMessage,
    buildBatchedInsightsPrompt
} from './groqPrompts';

import { callGenaiApi } from './genaiClient';
import {
    getGenaiSystemMessage,
    buildGenaiInsightPrompt,
    getGenaiBatchedInsightsSystemMessage,
    buildGenaiBatchedInsightsPrompt
} from './genaiPrompts';

// Type definition for cache entries
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 3600000;

// Predictions cache TTL (30 minutes)
const PREDICTIONS_CACHE_TTL = 30 * 60 * 1000;
const PREDICTIONS_CACHE_MAX_SIZE = 100;

// Cache for team statistics
const teamStatsCache = new Map<string, CacheEntry<Map<number, { win_pct: number; team_name: string; net_rating?: number }>>>();

// Cache for game predictions (LRU with timestamp)
const predictionsCache = new Map<string, { response: PredictionsResponse; timestamp: number }>();

// Cache for predictions accuracy
const accuracyCache = new Map<string, CacheEntry<{ accuracy: string }>>();

/**
 * Retry utility for NBA API calls with exponential backoff
 */
async function retryAxiosRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Don't retry certain types of errors
            if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`NBA API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Check if a date is historical (today or in the past)
 * Only historical predictions are cached to the database
 */
function isHistoricalDate(dateString: string): boolean {
    const [year, month, day] = dateString.split('-').map(Number);
    const checkDate = new Date(year, month - 1, day);
    checkDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return checkDate <= today;
}

/**
 * Calculate win probability based on team statistics
 */
function calculateWinProbability(
    homeWinPct: number,
    awayWinPct: number,
    homeNetRating?: number,
    awayNetRating?: number
): number {
    // Base probability from win percentages
    let homeAdvantage = homeWinPct - awayWinPct;

    // Add home court advantage (approximately 3-4 points)
    homeAdvantage += 0.03;

    // Add net rating adjustment if available
    if (homeNetRating !== undefined && awayNetRating !== undefined) {
        const ratingDiff = homeNetRating - awayNetRating;
        // Net rating difference roughly translates to ~0.01 probability per point
        homeAdvantage += ratingDiff * 0.01;
    }

    // Convert to probability using logistic function
    const probability = 1 / (1 + Math.exp(-homeAdvantage * 10));

    // Clamp between 0.05 and 0.95
    return Math.max(0.05, Math.min(0.95, probability));
}

/**
 * Predict score based on win probability
 */
function predictScore(winProbability: number): number {
    // Base score around 110-115 points
    const baseScore = 112;

    // Adjust based on win probability
    const adjustment = (winProbability - 0.5) * 10; // +/- 5 points

    return Math.round(baseScore + adjustment);
}

/**
 * Fix missing commas between properties in JSON
 * Handles cases like: "key": "value"\n"another_key": ...
 */
function fixMissingCommas(jsonStr: string): string {
    const initialLength = jsonStr.length;
    let fixed = jsonStr;
    let iterations = 0;
    const maxIterations = 10;
    let totalReplacements = 0;

    // Keep fixing until no more changes are detected
    while (iterations < maxIterations) {
        const before = fixed;

        // Pattern 1: Quoted value followed by optional comma, newline and quoted key (with colon)
        // This handles the main case: "value",?\n"key": or "value"\r\n"key": where comma may already exist
        // IMPORTANT: Use [ \t]* instead of \s* because \s includes newlines!
        // Also need to handle optional comma after the quote
        const count1 = (fixed.match(/"[ \t]*,?[ \t]*\r?\n(\s*)"([^"]*)":/g) || []).length;
        fixed = fixed.replace(/"[ \t]*,?[ \t]*\r?\n(\s*)"([^"]*)":/g, (match, spaces, key) => {
            totalReplacements++;
            return `",\n${spaces}"${key}":`;
        });

        // Pattern 2: Number/boolean value followed by optional comma, newline and quoted key  
        const count2 = (fixed.match(/([0-9]|true|false)[ \t]*,?[ \t]*\r?\n\s*("(?:[^"\\]|\\.)*"\s*:)/g) || []).length;
        fixed = fixed.replace(/([0-9]|true|false)[ \t]*,?[ \t]*\r?\n\s*("(?:[^"\\]|\\.)*"\s*:)/g, (match, value, key) => {
            totalReplacements++;
            return `${value},\n${key}`;
        });

        // Pattern 3: Closing brace/bracket followed by optional comma, newline and quoted key
        const count3 = (fixed.match(/([}\]])[ \t]*,?[ \t]*\r?\n\s*("(?:[^"\\]|\\.)*"\s*:)/g) || []).length;
        fixed = fixed.replace(/([}\]])[ \t]*,?[ \t]*\r?\n\s*("(?:[^"\\]|\\.)*"\s*:)/g, (match, bracket, key) => {
            totalReplacements++;
            return `${bracket},\n${key}`;
        });

        if (count1 > 0 || count2 > 0 || count3 > 0) {
            console.log(`[Predictions] fixMissingCommas iteration ${iterations + 1}: ${count1} quote-to-key, ${count2} number-to-key, ${count3} bracket-to-key`);
        }

        // If no changes were made, we're done
        if (fixed === before) break;
        iterations++;
    }

    if (totalReplacements > 0) {
        console.error(`[Predictions] fixMissingCommas: ${totalReplacements} total replacements in ${iterations} iterations`);
    }
    return fixed;
}


/**
 * Fix unterminated strings in JSON (Groq sometimes returns incomplete JSON)
 */
function fixUnterminatedStrings(jsonStr: string): string {
    try {
        JSON.parse(jsonStr);
        return jsonStr;
    } catch {
        // Continue to fix it
    }

    let inString = false;
    let escapeNext = false;
    const result: string[] = [];
    let i = 0;

    while (i < jsonStr.length) {
        const char = jsonStr[i];

        if (escapeNext) {
            result.push(char);
            escapeNext = false;
            i++;
            continue;
        }

        if (char === '\\') {
            result.push(char);
            escapeNext = true;
            i++;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            result.push(char);
            i++;
            continue;
        }

        result.push(char);
        i++;
    }

    // If still in string, close it
    if (inString) {
        result.push('"');
    }

    let fixed = result.join('');

    // Remove incomplete properties at the end (like "key": " or "key": without value)
    fixed = fixed.replace(/,\s*"[^"]*":\s*"[^"]*$/m, '');  // Remove incomplete string property
    fixed = fixed.replace(/,\s*"[^"]*":\s*$/m, '');  // Remove incomplete property
    fixed = fixed.replace(/,\s*$/m, '');  // Remove trailing comma at very end

    // Remove ALL trailing commas before closing brackets/braces
    // Use a loop to handle nested trailing commas
    let iterations = 0;
    while (iterations < 15) {
        const before = fixed;
        // Remove comma followed by whitespace and closing bracket/brace
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        // If no change, break
        if (fixed === before) break;
        iterations++;
    }

    // Count and close unclosed brackets
    const openBraces = (fixed.match(/{/g) || []).length - (fixed.match(/}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/]/g) || []).length;

    let finalResult = fixed;
    if (openBrackets > 0) finalResult += ']'.repeat(openBrackets);
    if (openBraces > 0) finalResult += '}'.repeat(openBraces);

    // Final validation - try to parse again
    try {
        JSON.parse(finalResult);
        return finalResult;
    } catch {
        // If still invalid, aggressively truncate to last complete object
        // Find the pattern of last complete object in an array
        const lastBraceIdx = finalResult.lastIndexOf('}');
        const lastCommaBeforeBrace = finalResult.lastIndexOf(',', lastBraceIdx);

        if (lastBraceIdx > 0) {
            // Try to find the opening { of the last object
            let braceCount = 0;
            let lastObjStart = lastBraceIdx;

            for (let i = lastBraceIdx - 1; i >= 0; i--) {
                if (finalResult[i] === '}') braceCount++;
                if (finalResult[i] === '{') {
                    if (braceCount === 0) {
                        lastObjStart = i;
                        break;
                    }
                    braceCount--;
                }
            }

            // Extract and validate the last few objects
            let partial = finalResult.substring(0, lastBraceIdx + 1);

            // Make sure we have balanced brackets
            const bracketOpen = (partial.match(/\[/g) || []).length;
            const bracketClose = (partial.match(/]/g) || []).length;
            if (bracketOpen > bracketClose) {
                partial += ']'.repeat(bracketOpen - bracketClose);
            }

            const rootOpen = (partial.match(/^{/) ? 1 : 0);
            const rootClose = (partial.match(/}/g) || []).length;
            if (rootOpen > rootClose) {
                partial += '}';
            }

            try {
                JSON.parse(partial);
                console.log('[Predictions] JSON truncated to last complete object');
                return partial;
            } catch {
                // Try even more aggressive truncation - go back to the object before last
                const insightsStart = finalResult.indexOf('"insights"');
                if (insightsStart > 0) {
                    const arrayStart = finalResult.indexOf('[', insightsStart);
                    if (arrayStart > 0) {
                        // Find second-to-last }, then add array close and root close
                        let closeBraceCount = 0;
                        for (let i = lastBraceIdx; i >= arrayStart; i--) {
                            if (finalResult[i] === '}') {
                                closeBraceCount++;
                                if (closeBraceCount === 2) {
                                    partial = finalResult.substring(0, i + 1) + ']}';
                                    try {
                                        JSON.parse(partial);
                                        console.log('[Predictions] JSON heavily truncated to second-to-last object');
                                        return partial;
                                    } catch {
                                        // Last attempt failed
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }

                // Give up, return as-is
                return finalResult;
            }
        }
        return finalResult;
    }
}

/**
 * Generate simple insights for a game (fallback when Groq is unavailable)
 */
function generateSimpleInsights(
    homeTeamName: string,
    awayTeamName: string,
    homeWinProb: number,
    predictedHomeScore?: number,
    predictedAwayScore?: number,
    homeWinPct?: number,
    awayWinPct?: number,
    homeNetRating?: number,
    awayNetRating?: number
): GamePredictionInsight[] {
    const insights: GamePredictionInsight[] = [];
    const homeWinProbPct = homeWinProb * 100;
    const awayWinProbPct = (1.0 - homeWinProb) * 100;
    const probDiff = Math.abs(homeWinProbPct - awayWinProbPct);

    // 1. Probability gap insight
    if (probDiff >= 15.0) {
        const favoredTeam = homeWinProb > 0.5 ? homeTeamName : awayTeamName;
        insights.push({
            title: 'Large probability gap',
            description: `${favoredTeam} have a clear edge based on win probability.`,
            impact: 'Strongly favors the favored team'
        });
    } else if (probDiff >= 8.0) {
        const favoredTeam = homeWinProb > 0.5 ? homeTeamName : awayTeamName;
        insights.push({
            title: 'Moderate probability gap',
            description: `${favoredTeam} are favored based on win probability.`,
            impact: 'Favors the favored team'
        });
    } else {
        insights.push({
            title: 'Close matchup',
            description: 'Win probabilities suggest a competitive game.',
            impact: 'Very close contest expected'
        });
    }

    // 2. Home court advantage (only if home team is favored)
    if (homeWinProb > 0.5) {
        insights.push({
            title: 'Home court advantage',
            description: `${homeTeamName} playing at home provides an edge.`,
            impact: 'Favors home team'
        });
    }

    // 3. Net rating advantage
    if (homeNetRating !== undefined && awayNetRating !== undefined) {
        const netRatingDiff = Math.abs(homeNetRating - awayNetRating);
        if (netRatingDiff >= 5.0) {
            const betterTeam = homeNetRating > awayNetRating ? homeTeamName : awayTeamName;
            insights.push({
                title: 'Efficiency advantage',
                description: `${betterTeam} have a stronger net rating advantage.`,
                impact: 'Advantage correlates with consistent performance'
            });
        }
    }

    return insights.slice(0, 3);
}

/**
 * Generate AI-powered insights using Groq (single game)
 */
async function generateAIInsights(
    homeTeamName: string,
    awayTeamName: string,
    homeWinProb: number,
    predictedHomeScore: number,
    predictedAwayScore: number,
    homeWinPct?: number,
    awayWinPct?: number,
    homeNetRating?: number,
    awayNetRating?: number
): Promise<GamePredictionInsight[]> {
    try {
        const groqApiKey = process.env.GROQ_API_KEY;
      
        if (!groqApiKey) {
            console.log('[Predictions] Groq API key not configured, using simple insights');
            return generateSimpleInsights(
                homeTeamName, awayTeamName, homeWinProb,
                predictedHomeScore, predictedAwayScore,
                homeWinPct, awayWinPct, homeNetRating, awayNetRating
            );
        }

        const homeWinProbPct = homeWinProb * 100;
        const awayWinProbPct = (1.0 - homeWinProb) * 100;
        let netRatingDiffStr = '';

        if (homeNetRating !== undefined && awayNetRating !== undefined) {
            const diff = homeNetRating - awayNetRating;
            netRatingDiffStr = `\nNet Rating Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} (${diff > 0 ? homeTeamName : awayTeamName})`;
        }

        const prompt = buildInsightPrompt({
            homeTeamName,
            awayTeamName,
            homeWinProbPct,
            awayWinProbPct,
            predictedHomeScore,
            predictedAwayScore,
            netRatingDiffStr
        });

        const systemMessage = getSystemMessage();

        const response = await callGroqApi(
            groqApiKey,
            systemMessage,
            prompt
        );

        let content = response.content;

         

       

        // Extract JSON from markdown code blocks
        if (content.includes('```json')) {
            content = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            content = content.split('```')[1].split('```')[0].trim();
        }

        const insightsData = JSON.parse(content);

        const insights: GamePredictionInsight[] = [];
        for (const item of insightsData.slice(0, 3)) {
            if (item.title && item.description) {
                insights.push({
                    title: item.title,
                    description: item.description,
                    impact: item.impact || 'Influences prediction confidence'
                });
            }
        }

        return insights.length > 0 ? insights : generateSimpleInsights(
            homeTeamName, awayTeamName, homeWinProb,
            predictedHomeScore, predictedAwayScore,
            homeWinPct, awayWinPct, homeNetRating, awayNetRating
        );

    } catch (error) {
        console.warn('[Predictions] Error generating AI insights, using simple insights:', error);
        return generateSimpleInsights(
            homeTeamName, awayTeamName, homeWinProb,
            predictedHomeScore ?? 0, predictedAwayScore ?? 0,
            homeWinPct, awayWinPct, homeNetRating, awayNetRating
        );
    }
}

/**
 * Generate batched AI insights for multiple games in one Groq call
 */
async function generateBatchedAIInsights(
    predictions: Array<{
        gameId: string;
        homeTeamName: string;
        awayTeamName: string;
        homeWinProb: number;
        awayWinProb: number;
        predictedHomeScore: number;
        predictedAwayScore: number;
        netRatingDiffStr?: string;
    }>
): Promise<Record<string, GamePredictionInsight[]>> {
    if (predictions.length === 0) return {};

    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            console.log('[Predictions] Groq API key not configured for batched insights');
            return {};
        }

        // Convert to format expected by prompt builder
        const formattedData = predictions.map(p => ({
            game_id: p.gameId,
            home_team_name: p.homeTeamName,
            away_team_name: p.awayTeamName,
            home_win_prob: p.homeWinProb,
            away_win_prob: p.awayWinProb,
            predicted_home_score: p.predictedHomeScore,
            predicted_away_score: p.predictedAwayScore,
            net_rating_diff_str: p.netRatingDiffStr || ''
        }));

        const prompt = buildBatchedInsightsPrompt(formattedData);
        const systemMessage = getBatchedInsightsSystemMessage();

        const response = await callGroqApi(
            groqApiKey,
            systemMessage,
            prompt
        );

        let content = response.content;

        // Extract JSON from markdown code blocks 
        if (content.includes('```json')) {
            content = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            content = content.split('```')[1].split('```')[0].trim();
        }

        // Fix missing commas - this is the main issue with Groq responses
        console.log('[Predictions] Before fixMissingCommas - length:', content.length);
        content = fixMissingCommas(content);
        console.log('[Predictions] After fixMissingCommas - length:', content.length);

        // Extract JSON by finding the last complete insight object, then close arrays/objects
        // Look for pattern: },  (end of insight) then close the insights array and root object
        let lastInsightEnd = content.lastIndexOf('},');
        if (lastInsightEnd > 0) {
            // Find position after the comma
            lastInsightEnd += 2;  // Move past the }, 
            // Truncate and close the array and root object
            content = content.substring(0, lastInsightEnd).trim();
            // Remove any trailing comma or invalid characters, then close
            while (content.endsWith(',') || content.endsWith('\n') || content.endsWith(' ')) {
                content = content.slice(0, -1);
            }
            content += '\n]}';
            console.log('[Predictions] Extracted safe JSON ending, new length:', content.length);
        }

        let insightsData;
        try {
            insightsData = JSON.parse(content.substring(0, 10000)); // Limit to first 10k chars for parsing
            console.log('[Predictions] ✓ JSON parsed successfully! Found AI insights for', insightsData.insights?.length || 0, 'games');
        } catch (parseError) {
            console.error('[Predictions] JSON parse error after fixMissingCommas:', (parseError as Error).message);
            console.warn('[Predictions] Returning empty insights dict, will use simple insights fallback');
            return {};
        }

        const result: Record<string, GamePredictionInsight[]> = {};

        if (insightsData.insights) {
            for (const gameInsights of insightsData.insights) {
                const gameId = gameInsights.game_id;
                const insightsList = gameInsights.insights || [];

                if (!gameId) continue;

                const parsed: GamePredictionInsight[] = [];
                for (const item of insightsList.slice(0, 3)) {
                    if (item.title && item.description) {
                        parsed.push({
                            title: item.title,
                            description: item.description,
                            impact: item.impact || 'Influences prediction confidence'
                        });
                    }
                }

                if (parsed.length > 0) {
                    result[gameId] = parsed;
                }
            }
        }

        console.log(`[Predictions] Generated batched AI insights for ${Object.keys(result).length}/${predictions.length} games`);
        return result;
    } catch (error) {
        console.error('[Predictions] Error generating batched AI insights:', error);
        return {};
    }
}

/**
 * Generate enhanced AI analysis for predictions
 */
async function generateEnhancedAnalysis(
    predictions: Array<{
        gameId: string;
        homeTeamName: string;
        awayTeamName: string;
        homeWinProb: number;
        awayWinProb: number;
        predictedHomeScore: number;
        predictedAwayScore: number;
        confidence: number;
    }>
): Promise<Record<string, any>> {
    if (predictions.length === 0) return {};

    try {
        const groqApiKey = process.env.GROQ_API_KEY;
        if (!groqApiKey) {
            console.log('[Predictions] Groq API key not configured for enhanced analysis');
            return {};
        }

        // Build simple prompt for enhanced game analysis
        const gamesText = predictions.map(p =>
            `Game: ${p.awayTeamName} @ ${p.homeTeamName}\n` +
            `Predicted Score: ${p.predictedHomeScore}-${p.predictedAwayScore}\n` +
            `Win Probability: ${p.homeTeamName} ${(p.homeWinProb * 100).toFixed(1)}%`
        ).join('\n\n');

        const prompt = `Analyze the following NBA game predictions and provide key drivers, risk factors, and narratives for each:\n\n${gamesText}\n\nReturn as JSON.`;
        const systemMessage = getSystemMessage();

        const response = await callGroqApi(
            groqApiKey,
            systemMessage,
            prompt
        );

        let content = response.content;

        // Extract JSON
        if (content.includes('```json')) {
            content = content.split('```json')[1].split('```')[0].trim();
        } else if (content.includes('```')) {
            content = content.split('```')[1].split('```')[0].trim();
        }

        // Fix missing commas and unterminated strings
        content = fixMissingCommas(content);
        content = fixUnterminatedStrings(content);

        let analysisData;
        try {
            analysisData = JSON.parse(content);
        } catch (parseError) {
            console.error('[Predictions] JSON parse error in game analysis:', parseError);
            console.error('[Predictions] Content length:', content.length);
            console.error('[Predictions] First 500 chars:', content.substring(0, 500));
            return {};
        }

        const result: Record<string, any> = {};

        // Parse response - structure may vary
        if (Array.isArray(analysisData)) {
            for (const analysis of analysisData) {
                if (analysis.game_id || analysis.gameId) {
                    const gameId = analysis.game_id || analysis.gameId;
                    result[gameId] = {
                        narrative: analysis.narrative || analysis.matchup_narrative || '',
                        keyFactors: analysis.key_drivers || analysis.key_factors || []
                    };
                }
            }
        } else if (analysisData.games && Array.isArray(analysisData.games)) {
            for (const gameAnalysis of analysisData.games) {
                if (gameAnalysis.game_id) {
                    result[gameAnalysis.game_id] = gameAnalysis;
                }
            }
        }

        return result;

    } catch (error) {
        console.warn('[Predictions] Error generating enhanced analysis:', error);
        return {};
    }
}

/**
 * Get team statistics from games data with net rating support
 */
async function getTeamStatistics(season: string): Promise<Map<number, { win_pct: number; team_name: string; net_rating?: number }>> {
    try {
        // Check cache first
        const cached = teamStatsCache.get(season);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Returning cached team statistics for season ${season}`);
            return cached.data;
        }

        console.log(`Cache miss for team statistics ${season}, fetching from API`);

        // Get team standings data from NBA API
        const standingsResponse = await retryAxiosRequest(async () => {
            return await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {
                params: {
                    LeagueID: '00',
                    Season: season,
                    SeasonType: 'Regular Season'
                },
                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"

                },
                timeout: 60000
            });
        });

        if (!standingsResponse.data?.resultSets?.[0]?.rowSet) {
            console.log(`No standings data found for season ${season}, returning empty stats`);
            return new Map();
        }

        const headers = standingsResponse.data.resultSets[0].headers;
        const teamsData = standingsResponse.data.resultSets[0].rowSet;

        // Helper function to safely parse values
        const safeInt = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
        };

        const safeFloat = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined || value === '') return defaultValue;
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
        };

        const safeStr = (value: any, defaultValue: string = ''): string => {
            if (value === null || value === undefined) return defaultValue;
            return String(value).trim() || defaultValue;
        };

        // Convert to team statistics map
        const result = new Map<number, { win_pct: number; team_name: string; net_rating?: number }>();
        teamsData.forEach((row: any[]) => {
            const getValue = (headerName: string) => {
                const index = headers.indexOf(headerName);
                return index !== -1 ? row[index] : null;
            };

            const teamId = safeInt(getValue('TeamID'), 0);
            const teamCity = safeStr(getValue('TeamCity'), '');
            const teamName = safeStr(getValue('TeamName'), '');
            const wins = safeInt(getValue('WINS'), 0);
            const losses = safeInt(getValue('LOSSES'), 0);
            const winPct = safeFloat(getValue('WinPCT'), 0);

            if (teamId > 0) {
                result.set(teamId, {
                    win_pct: winPct,
                    team_name: `${teamCity} ${teamName}`.trim(),
                    net_rating: undefined  // Can be added if NBA API provides it
                });
            }
        });

        // Cache the result
        teamStatsCache.set(season, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.log(`Error fetching team statistics for season ${season}:`, error);
        return new Map();
    }
}


export async function calculatePredictionsAccuracyForLastMonth() {
    try {
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        const dateStr = lastMonth.toISOString().split('T')[0];
        const season = `${lastMonth.getFullYear()}-${(lastMonth.getFullYear() + 1).toString().slice(-2)}`;

        const cacheKey = `acc_${dateStr}_${season}`;
        const cached = accuracyCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Returning cached predictions accuracy for last month`);
            return cached.data;
        }

        // Calculate predictions accuracy for last month
        const result = {
            accuracy: "76%", // Placeholder, implement actual accuracy calculation logic
        };

        // Cache the result
        accuracyCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    }
    catch (error) {
        console.log('Error calculating predictions accuracy for last month:', error);
    }
}

/**
 * Predict games for a specific date with AI insights
 */
export async function predictGamesForDate(date: string, season: string): Promise<PredictionsResponse | null> {
    try {
        // STEP 0: Check database cache first (persists across server restarts)
        console.log(`[Predictions] Checking database cache for ${date}...`);
        const dbCached = await dataCache.getPredictionsForDate(date);
        
        if (dbCached) {
            console.log(`[Predictions] ✓ Found predictions in database cache for ${date}`);
            return dbCached;
        }

        // STEP 1: Check memory cache (short-term, faster)
        const cacheKey = `${date}_${season}`;
        const cached = predictionsCache.get(cacheKey);

        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < PREDICTIONS_CACHE_TTL) {
                console.log(`[Predictions] Returning cached predictions for ${date} (age: ${(age / 1000).toFixed(0)}s)`);
                // Move to end for LRU
                predictionsCache.delete(cacheKey);
                predictionsCache.set(cacheKey, cached);
                return cached.response;
            } else {
                console.log(`[Predictions] Cache entry expired for ${cacheKey}`);
                predictionsCache.delete(cacheKey);
            }
        }

        console.log(`[Predictions] Cache miss for ${date}, generating predictions`);
        const gamesResponse = await getGamesForDate(date);

        if (!gamesResponse || gamesResponse.games.length === 0) {
            return {
                date: date,
                predictions: [],
                season: season
            };
        }

        // Get team statistics
        const teamStats = await getTeamStatistics(season);
        if (teamStats.size === 0) {
            console.log(`[Predictions] No team statistics available for season ${season}`);
            return {
                date: date,
                predictions: [],
                season: season
            };
        }

        const predictions: GamePrediction[] = [];
        const predictionsForBatch: Array<{
            gameId: string;
            homeTeamName: string;
            awayTeamName: string;
            homeWinProb: number;
            awayWinProb: number;
            predictedHomeScore: number;
            predictedAwayScore: number;
            netRatingDiffStr?: string;
            confidence: number;
        }> = [];

        // STEP 1: Calculate base predictions for all games
        const gameDataMap = new Map<string, any>();

        for (const game of gamesResponse.games) {
            try {
                const homeTeamId = game.home_team.team_id;
                const awayTeamId = game.away_team.team_id;

                const homeStats = teamStats.get(homeTeamId);
                const awayStats = teamStats.get(awayTeamId);

                const homeWinPct = homeStats?.win_pct || 0.5;
                const awayWinPct = awayStats?.win_pct || 0.5;
                const homeTeamName = homeStats?.team_name || game.home_team.team_abbreviation;
                const awayTeamName = awayStats?.team_name || game.away_team.team_abbreviation;
                const homeNetRating = homeStats?.net_rating;
                const awayNetRating = awayStats?.net_rating;

                // Calculate win probability
                const homeWinProb = calculateWinProbability(homeWinPct, awayWinPct, homeNetRating, awayNetRating);
                const awayWinProb = 1 - homeWinProb;

                // Predict scores
                const predictedHomeScore = predictScore(homeWinProb);
                const predictedAwayScore = predictScore(awayWinProb);

                // Calculate confidence
                const probGap = Math.abs(homeWinProb - 0.5) * 2;
                let confidence = 0.5;
                if (probGap > 0.2) confidence = 0.8;
                else if (probGap > 0.1) confidence = 0.7;
                else if (probGap > 0.05) confidence = 0.6;

                // Prepare for batched Groq call
                let netRatingDiffStr = '';
                if (homeNetRating !== undefined && awayNetRating !== undefined) {
                    const diff = homeNetRating - awayNetRating;
                    netRatingDiffStr = `+${diff.toFixed(1)} (${diff > 0 ? homeTeamName : awayTeamName})`;
                }

                predictionsForBatch.push({
                    gameId: game.game_id,
                    homeTeamName,
                    awayTeamName,
                    homeWinProb,
                    awayWinProb,
                    predictedHomeScore,
                    predictedAwayScore,
                    netRatingDiffStr,
                    confidence
                });

                gameDataMap.set(game.game_id, {
                    game,
                    homeTeamId,
                    homeTeamName,
                    awayTeamId,
                    awayTeamName,
                    homeWinProb,
                    awayWinProb,
                    predictedHomeScore,
                    predictedAwayScore,
                    homeWinPct,
                    awayWinPct,
                    homeNetRating,
                    awayNetRating,
                    confidence
                });

            } catch (error) {
                console.warn(`[Predictions] Error preparing game ${game.game_id}:`, error);
            }
        }

        // STEP 2: Generate batched AI insights in one Groq call
        console.log(`[Predictions] Generating batched AI insights for ${predictionsForBatch.length} games`);
        const batchedInsights = await generateBatchedAIInsights(predictionsForBatch);

        // STEP 3: Create GamePrediction objects using insights
        for (const [gameId, gameData] of gameDataMap) {
            try {
                const game = gameData.game;
                const insights = batchedInsights[gameId] || generateSimpleInsights(
                    gameData.homeTeamName,
                    gameData.awayTeamName,
                    gameData.homeWinProb,
                    gameData.predictedHomeScore,
                    gameData.predictedAwayScore,
                    gameData.homeWinPct,
                    gameData.awayWinPct,
                    gameData.homeNetRating,
                    gameData.awayNetRating
                );

                // Determine confidence tier
                let confidenceTier: 'high' | 'medium' | 'low' = 'medium';
                if (gameData.confidence >= 0.7) confidenceTier = 'high';
                else if (gameData.confidence >= 0.5) confidenceTier = 'medium';
                else confidenceTier = 'low';

                const prediction: GamePrediction = {
                    game_id: gameId,
                    home_team_id: gameData.homeTeamId,
                    home_team_name: gameData.homeTeamName,
                    away_team_id: gameData.awayTeamId,
                    away_team_name: gameData.awayTeamName,
                    game_date: date,
                    home_win_probability: gameData.homeWinProb,
                    away_win_probability: gameData.awayWinProb,
                    predicted_home_score: gameData.predictedHomeScore,
                    predicted_away_score: gameData.predictedAwayScore,
                    confidence: gameData.confidence,
                    insights: insights,
                    home_team_win_pct: gameData.homeWinPct,
                    away_team_win_pct: gameData.awayWinPct,
                    home_team_net_rating: gameData.homeNetRating,
                    away_team_net_rating: gameData.awayNetRating,
                    confidence_tier: confidenceTier
                };

                predictions.push(prediction);

            } catch (error) {
                console.warn(`[Predictions] Error creating prediction for game ${gameId}:`, error);
            }
        }

        const result = {
            date: date,
            predictions: predictions,
            season: season
        };

        // Cache the result in memory with LRU eviction (cacheKey already declared above)
        predictionsCache.set(cacheKey, {
            response: result,
            timestamp: Date.now()
        });

        // Enforce size limit for memory cache
        if (predictionsCache.size > PREDICTIONS_CACHE_MAX_SIZE) {
            const firstKey = predictionsCache.keys().next().value;
            if (firstKey) {
                predictionsCache.delete(firstKey);
                console.log(`[Predictions] LRU eviction: removed oldest cache entry ${firstKey}`);
            }
        }

        // Cache in database only for historical dates (today or in the past)
        // This prevents storing predictions for upcoming games that may change
        if (isHistoricalDate(date)) {
            console.log(`[Predictions] Storing historical predictions in database cache for ${date}...`);
            dataCache.setPredictionsForDate(date, result);
            console.log(`[Predictions] ✓ Stored ${predictions.length} historical predictions in database cache for ${date}`);
        } else {
            console.log(`[Predictions] Skipping database cache for upcoming date ${date} (not historical)`);
        }

        console.log(`[Predictions] Generated ${predictions.length} predictions for ${date} (season ${season})`);
        return result;

    } catch (error) {
        console.error(`[Predictions] Error predicting games for date ${date}:`, error);
        return null;
    }
}