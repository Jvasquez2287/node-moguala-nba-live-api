/**
 * Win probability service for calculating game win probabilities.
 */

import * as winston from 'winston';
import axios from 'axios';
import { WinProbability } from '../schemas/scoreboard';


// Type definition for cache entries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache duration in milliseconds (10 minutes for live games)
const CACHE_DURATION = 600000;

// Cache for win probabilities
const winProbabilityCache = new Map<string, CacheEntry<WinProbability>>();

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
 * Calculate win probability based on game state and team strength
 */
function calculateWinProbability(
  homeScore: number,
  awayScore: number,
  minutesRemaining: number,
  homeWinPct: number,
  awayWinPct: number,
  homeNetRating?: number,
  awayNetRating?: number
): number {
  // Score differential
  const scoreDiff = homeScore - awayScore;

  // Normalize minutes remaining (0 to 1 scale, where 1 is start of game)
  const totalMinutes = 48;
  const minutesElapsed = Math.max(0, totalMinutes - minutesRemaining);
  const gameProgress = Math.min(1, minutesElapsed / totalMinutes);

  // Base probability from team strength
  let baseProb = homeWinPct - awayWinPct;

  // Add home court advantage (~3 percentage points)
  baseProb += 0.03;

  // Add net rating adjustment if available
  if (homeNetRating !== undefined && awayNetRating !== undefined) {
    baseProb += (homeNetRating - awayNetRating) * 0.01;
  }

  // Current score adjustment
  // Each point is worth about 1.5-2% win probability depending on time remaining
  const pointValue = minutesRemaining > 0 ? 0.02 - (0.005 * gameProgress) : 0.01;
  baseProb += scoreDiff * pointValue;

  // Time factor: closer to end of game, larger current score differential matters
  const timeFactor = 1 + gameProgress;
  baseProb *= timeFactor;

  // Convert to probability using logistic function
  const probability = 1 / (1 + Math.exp(-baseProb * 5));

  // Clamp between 0.01 and 0.99
  return Math.max(0.01, Math.min(0.99, probability));
}

/**
 * Get win probability for a single game.
 */
export async function getWinProbability(gameId: string): Promise<WinProbability | null> {
  try {
    // Check cache first
    const cached = winProbabilityCache.get(gameId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
     console.log(`Returning cached win probability for game ${gameId}`);
      return cached.data;
    }

   console.log(`Cache miss for win probability ${gameId}, fetching from API`);

    // Fetch box score data
    const boxScoreResponse = await retryAxiosRequest(async () => {
      return await axios.get('https://stats.nba.com/stats/boxscoretraditionalv2', {
        params: {
          GameID: gameId
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

    if (!boxScoreResponse.data?.resultSets) {
     console.log(`No box score data found for game ${gameId}`);
      return null;
    }

    const teamStats = boxScoreResponse.data.resultSets[0];
    if (!teamStats?.rowSet || teamStats.rowSet.length < 2) {
     console.log(`Incomplete team stats for game ${gameId}`);
      return null;
    }

    // Get team scores and stats
    const headers = teamStats.headers;
    const getValue = (row: any[], headerName: string) => {
      const index = headers.indexOf(headerName);
      return index !== -1 ? row[index] : null;
    };

    const homeTeamRow = teamStats.rowSet[0]; // Home team is first
    const awayTeamRow = teamStats.rowSet[1]; // Away team is second

    const homeTeamId = getValue(homeTeamRow, 'TEAM_ID') || 0;
    const awayTeamId = getValue(awayTeamRow, 'TEAM_ID') || 0;
    const homeScore = getValue(homeTeamRow, 'PTS') || 0;
    const awayScore = getValue(awayTeamRow, 'PTS') || 0;

    // Fetch standings to get win percentages
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;

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

    let homeWinPct = 0.5;
    let awayWinPct = 0.5;

    if (standingsResponse.data?.resultSets?.[0]?.rowSet) {
      const standingsHeaders = standingsResponse.data.resultSets[0].headers;
      const teamsData = standingsResponse.data.resultSets[0].rowSet;

      const getStandingValue = (row: any[], headerName: string) => {
        const index = standingsHeaders.indexOf(headerName);
        return index !== -1 ? row[index] : null;
      };

      for (const teamRow of teamsData) {
        const teamId = getStandingValue(teamRow, 'TeamID');
        const winPct = getStandingValue(teamRow, 'WinPCT') || 0.5;

        if (teamId === homeTeamId) {
          homeWinPct = winPct;
        } else if (teamId === awayTeamId) {
          awayWinPct = winPct;
        }
      }
    }

    // Estimate minutes remaining
    // This is a simplified calculation; in a real scenario you'd parse the game clock
    const minutesRemaining = 12; // Default assumption: mid-game

    // Calculate win probability
    const homeWinProb = calculateWinProbability(
      homeScore,
      awayScore,
      minutesRemaining,
      homeWinPct,
      awayWinPct
    );

    const result: WinProbability = {
      home_win_prob: homeWinProb,
      away_win_prob: 1 - homeWinProb,
      timestamp: new Date().toISOString(),
      probability_history: []
    };

    // Cache the result
    winProbabilityCache.set(gameId, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error: any) {
   console.log(`Error calculating win probability for game ${gameId}:`, error.message || error);
    return null;
  }
}

/**
 * Get win probability for multiple games.
 */
export async function getWinProbabilityForMultipleGames(gameIds: string[]): Promise<Map<string, WinProbability>> {
  const results = new Map<string, WinProbability>();

  for (const gameId of gameIds) {
    const probability = await getWinProbability(gameId);
    if (probability) {
      results.set(gameId, probability);
    }
  }

  return results;
}