/**
 * League service for NBA data operations.
 * Handles league-wide statistics and leaderboards.
 */

import * as winston from 'winston';
import axios from 'axios';
import { LeagueLeadersResponse, LeagueLeader } from '../schemas/league';
import { dataCache } from './dataCache';

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
 * Get league leaders for a specific stat category
 */
export async function getLeagueLeaders(
    statCategory: string = 'PTS',
    season?: string,
    topN: number = 5
): Promise<LeagueLeadersResponse | null> {
    // Validate stat category
    const validCategories = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG_PCT', 'FG3_PCT', 'FT_PCT'];
    const category = statCategory.toUpperCase();
    if (!validCategories.includes(category)) {
       console.log(`Invalid stat category: ${statCategory}`);
        return null;
    }

    // Default to current season if not provided
    let seasonParam = season;
    if (!seasonParam) {
        const now = new Date();
        const year = now.getFullYear();
        const nextYear = year + 1;
        seasonParam = now.getMonth() >= 9 ? `${year}-${nextYear.toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
    }

    // Check cache first
    const cachedData = await dataCache.getLeagueLeaders(category, seasonParam);
    if (cachedData) {
       console.log(`Returning cached league leaders for ${category} in ${seasonParam}`);
        return cachedData;
    }

   console.log(`Cache miss for league leaders ${category} in ${seasonParam}, fetching from API`);

    try {
        // Map stat categories to NBA API parameters
        const statMapping: { [key: string]: string } = {
            'PTS': 'PTS',
            'REB': 'REB',
            'AST': 'AST',
            'STL': 'STL',
            'BLK': 'BLK',
            'FG_PCT': 'FG_PCT',
            'FG3_PCT': 'FG3_PCT',
            'FT_PCT': 'FT_PCT'
        };

        const nbaStat = statMapping[category];

        // Get league leaders from NBA API
        const data = await retryAxiosRequest(async () => {
            const response = await axios.get('https://stats.nba.com/stats/leaguedashplayerstats', {
                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "Referer": "https://stats.nba.com/",
                    "Pragma": "no-cache",
                    "Cache-Control": "no-cache",
                    "Sec-Ch-Ua": "\"Chromium\";v=\"140\", \"Google Chrome\";v=\"140\", \"Not;A=Brand\";v=\"24\"",
                    "Sec-Ch-Ua-Mobile": "?0",
                    "Sec-Ch-Ua-Platform": "\"Windows\"",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin"
                }, params: {
                    SortOrder: 'DESC',
                    StatCategory: nbaStat,
                    Scope: 'S',
                    College: "",
                    Conference: "",
                    Country: "",
                    DateFrom: "",
                    DateTo: "",
                    Division: "",
                    DraftPick: "",
                    DraftYear: "",
                    GameScope: "",
                    GameSegment: "",
                    Height: "",
                    LastNGames: "0",
                    LeagueID: "00",
                    Location: "",
                    MeasureType: "Base",
                    Month: "0",
                    OpponentTeamID: "0",
                    Outcome: "",
                    PORound: "0",
                    PaceAdjust: "N",
                    PerMode: "PerGame",
                    Period: "0",
                    PlayerExperience: "",
                    PlayerPosition: "",
                    PlusMinus: "N",
                    Rank: "N",
                    Season: seasonParam,
                    SeasonSegment: "",
                    SeasonType: "Regular Season",
                    ShotClockRange: "",
                    StarterBench: "",
                    TeamID: "0",
                    TwoWay: "0",
                    VsConference: "",
                    VsDivision: "",
                    Weight: "" 
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response.data;
        });

        if (!data?.resultSets?.[0]?.rowSet) {
           console.log(`No league leaders data found for ${category} in ${seasonParam}`);
            return null;
        }

        const headers = data.resultSets[0].headers;
        const playersData = data.resultSets[0].rowSet;

        // Helper function to safely get values
        const getValue = (row: any[], headerName: string) => {
            const index = headers.indexOf(headerName);
            return index !== -1 ? row[index] : null;
        };

        const leaders: LeagueLeader[] = [];

        for (const player of playersData.slice(0, topN)) {
            const playerId = getValue(player, 'PLAYER_ID');
            const playerName = getValue(player, 'PLAYER_NAME') || '';
            const teamAbbrev = getValue(player, 'TEAM_ABBREVIATION') || 'N/A';
            const gamesPlayed = getValue(player, 'GP') || 0;

            let statValue = 0;
            switch (category) {
                case 'PTS':
                    statValue = getValue(player, 'PTS') || 0;
                    break;
                case 'REB':
                    statValue = getValue(player, 'REB') || 0;
                    break;
                case 'AST':
                    statValue = getValue(player, 'AST') || 0;
                    break;
                case 'STL':
                    statValue = getValue(player, 'STL') || 0;
                    break;
                case 'BLK':
                    statValue = getValue(player, 'BLK') || 0;
                    break;
                case 'FG_PCT':
                    statValue = getValue(player, 'FG_PCT') || 0;
                    break;
                case 'FG3_PCT':
                    statValue = getValue(player, 'FG3_PCT') || 0;
                    break;
                case 'FT_PCT':
                    statValue = getValue(player, 'FT_PCT') || 0;
                    break;
            }

            if (playerId && statValue > 0) {
                leaders.push({
                    player_id: playerId,
                    name: playerName,
                    team: teamAbbrev,
                    stat_value: statValue,
                    rank: leaders.length + 1,
                    games_played: gamesPlayed
                });
            }
        }

        const result = {
            category: category,
            season: seasonParam,
            leaders: leaders
        };

        // Cache the result
        dataCache.setLeagueLeaders(category, seasonParam, result);

        return result;
    } catch (error: any) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
           console.log(`NBA API timeout error for league leaders (${category}, ${seasonParam}): Request took longer than 60 seconds`);
        } else if (error.response?.status === 429) {
           console.log(`NBA API rate limit exceeded for league leaders (${category}, ${seasonParam}): ${error.response?.status} ${error.response?.statusText}`);
        } else if (error.response?.status >= 500) {
           console.log(`NBA API server error for league leaders (${category}, ${seasonParam}): ${error.response?.status} ${error.response?.statusText}`);
        } else if (error.response?.status >= 400) {
           console.log(`NBA API client error for league leaders (${category}, ${seasonParam}): ${error.response?.status} ${error.response?.statusText}`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
           console.log(`NBA API network error for league leaders (${category}, ${seasonParam}): ${error.message}`);
        } else {
           console.log(`Unexpected error fetching league leaders for ${category} in ${seasonParam}:`, error.message || error);
        }
        return null;
    }
}