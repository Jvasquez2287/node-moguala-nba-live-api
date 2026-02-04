/**
 * Predictions service for NBA data operations.
 * Handles game outcome predictions based on team statistics.
 */

import * as winston from 'winston';
import axios from 'axios';
import { PredictionsResponse, GamePrediction } from '../schemas/predictions';
import { getGamesForDate } from './schedule';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Type definition for cache entries
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 3600000;

// Cache for team statistics
const teamStatsCache = new Map<string, CacheEntry<Map<number, { win_pct: number; team_name: string }>>>();

// Cache for game predictions
const predictionsCache = new Map<string, CacheEntry<PredictionsResponse>>();

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
 * Generate simple insights for a game
 */
function generateSimpleInsights(
    homeTeamName: string,
    awayTeamName: string,
    homeWinProb: number
): Array<{ title: string; description: string; impact: string }> {
    const insights = [];
    const probDiff = Math.abs(homeWinProb - 0.5) * 2; // 0-1 scale

    if (probDiff > 0.2) {
        const favoredTeam = homeWinProb > 0.5 ? homeTeamName : awayTeamName;
        insights.push({
            title: 'Clear favorite',
            description: `${favoredTeam} have a significant advantage based on current form.`,
            impact: 'Strongly favors the favored team'
        });
    } else if (probDiff > 0.1) {
        const favoredTeam = homeWinProb > 0.5 ? homeTeamName : awayTeamName;
        insights.push({
            title: 'Moderate advantage',
            description: `${favoredTeam} have a slight edge in this matchup.`,
            impact: 'Favors the favored team'
        });
    } else {
        insights.push({
            title: 'Close matchup',
            description: 'This should be a competitive game between evenly matched teams.',
            impact: 'Very close contest expected'
        });
    }

    // Add home court advantage if applicable
    if (homeWinProb > 0.5) {
        insights.push({
            title: 'Home court advantage',
            description: `${homeTeamName} benefit from playing at home.`,
            impact: 'Favors home team'
        });
    }

    return insights.slice(0, 3); // Limit to 3 insights
}

/**
 * Get team statistics from games data
 */
async function getTeamStatistics(season: string): Promise<Map<number, { win_pct: number; team_name: string }>> {
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
        const result = new Map<number, { win_pct: number; team_name: string }>();
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
                    team_name: `${teamCity} ${teamName}`.trim()
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

/**
 * Predict games for a specific date
 */
export async function predictGamesForDate(date: string, season: string): Promise<PredictionsResponse | null> {
    try {
        // Check cache first
        const cacheKey = `${date}_${season}`;
        const cached = predictionsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
           console.log(`Returning cached predictions for date ${date} season ${season}`);
            return cached.data;
        }

       console.log(`Cache miss for predictions ${date}, fetching from API`);
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

        const predictions: GamePrediction[] = [];

        for (const game of gamesResponse.games) {
            try {
                const homeTeamId = game.home_team.team_id;
                const awayTeamId = game.away_team.team_id;

                const homeStats = teamStats.get(homeTeamId);
                const awayStats = teamStats.get(awayTeamId);

                // Use default values if stats not available
                const homeWinPct = homeStats?.win_pct || 0.5;
                const awayWinPct = awayStats?.win_pct || 0.5;
                const homeTeamName = homeStats?.team_name || game.home_team.team_abbreviation;
                const awayTeamName = awayStats?.team_name || game.away_team.team_abbreviation;

                // Calculate win probability
                const homeWinProb = calculateWinProbability(homeWinPct, awayWinPct);
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

                // Generate insights
                const insights = generateSimpleInsights(homeTeamName, awayTeamName, homeWinProb);

                const prediction: GamePrediction = {
                    game_id: game.game_id,
                    home_team_id: homeTeamId,
                    home_team_name: homeTeamName,
                    away_team_id: awayTeamId,
                    away_team_name: awayTeamName,
                    game_date: date,
                    home_win_probability: homeWinProb,
                    away_win_probability: awayWinProb,
                    predicted_home_score: predictedHomeScore,
                    predicted_away_score: predictedAwayScore,
                    confidence: confidence,
                    insights: insights,
                    home_team_win_pct: homeWinPct,
                    away_team_win_pct: awayWinPct,
                    home_team_net_rating: undefined, // Not available in basic API
                    away_team_net_rating: undefined  // Not available in basic API
                };

                predictions.push(prediction);
            } catch (error) {
               console.log(`Error predicting game ${game.game_id}:`, error);
                // Continue with other games
            }
        }

        const result = {
            date: date,
            predictions: predictions,
            season: season
        };

        // Cache the result
        predictionsCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
       console.log(`Error predicting games for date ${date}:`, error);
        return null;
    }
}