/**
 * Search service for NBA data operations.
 * Handles searching for players and teams by name.
 */

import * as winston from 'winston';
import axios from 'axios';
import { SearchResults, PlayerResult, TeamResult } from '../schemas/search';

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

// Cache for search results
const searchCache = new Map<string, CacheEntry<SearchResults>>();

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
 * Search for players and teams by name
 */
export async function searchEntities(query: string): Promise<SearchResults | null> {
    try {
        // Check cache first
        const queryLower = query.toLowerCase();
        const cached = searchCache.get(queryLower);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
           console.log(`Returning cached search results for query "${query}"`);
            return cached.data;
        }

       console.log(`Cache miss for search query "${query}", fetching from API`);

        const searchLower = queryLower;
        const playerResults: PlayerResult[] = [];
        const teamResults: TeamResult[] = [];

        // Get current season for player search
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;

        // Search for players using NBA API
        try {
            const playersResponse = await retryAxiosRequest(async () => {
                return await axios.get('https://stats.nba.com/stats/playerindex', {
                    headers: {
                        "Host": "stats.nba.com",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Referer": "https://www.nba.com/",
                        "Origin": "https://www.nba.com",
                        "Connection": "keep-alive"
                    }, params: {
                        LeagueID: '00',
                        Season: season,
                        Historical: 1 // Include historical data
                    },
                    timeout: 60000
                });
            });

            if (playersResponse.data?.resultSets?.[0]?.rowSet) {
                const headers = playersResponse.data.resultSets[0].headers;
                const playersData = playersResponse.data.resultSets[0].rowSet;

                // Helper function to safely get values
                const getValue = (row: any[], headerName: string) => {
                    const index = headers.indexOf(headerName);
                    return index !== -1 ? row[index] : null;
                };

                for (const player of playersData.slice(0, 10)) {
                    const playerName = `${getValue(player, 'PLAYER_FIRST_NAME') || ''} ${getValue(player, 'PLAYER_LAST_NAME') || ''}`.trim();
                    if (playerName.toLowerCase().includes(searchLower)) {
                        playerResults.push({
                            id: getValue(player, 'PERSON_ID') || 0,
                            name: playerName,
                            team_id: getValue(player, 'TEAM_ID') || 0,
                            team_abbreviation: getValue(player, 'TEAM_ABBREVIATION') || ''
                        });
                    }
                }
            }
        } catch (error) {
           console.log('Error searching players:', error);
        }

        // Search for teams using NBA API
        try {
            const teamsResponse = await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {

                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                }, params: {
                    LeagueID: '00',
                    Season: season,
                    SeasonType: 'Regular Season'
                },
                timeout: 30000
            });

            if (teamsResponse.data?.resultSets?.[0]?.rowSet) {
                const headers = teamsResponse.data.resultSets[0].headers;
                const teamsData = teamsResponse.data.resultSets[0].rowSet;

                // Helper function to safely get values
                const getValue = (row: any[], headerName: string) => {
                    const index = headers.indexOf(headerName);
                    return index !== -1 ? row[index] : null;
                };

                for (const team of teamsData) {
                    const teamName = `${getValue(team, 'TeamCity') || ''} ${getValue(team, 'TeamName') || ''}`.trim();
                    const abbreviation = getValue(team, 'TeamName') || '';

                    // Check if search term matches team name, abbreviation, or city
                    if (
                        teamName.toLowerCase().includes(searchLower) ||
                        abbreviation.toLowerCase().includes(searchLower) ||
                        (getValue(team, 'TeamCity') || '').toLowerCase().includes(searchLower)
                    ) {
                        teamResults.push({
                            id: getValue(team, 'TeamID') || 0,
                            name: teamName,
                            abbreviation: abbreviation
                        });

                        // Limit to 10 teams
                        if (teamResults.length >= 10) {
                            break;
                        }
                    }
                }
            }
        } catch (error) {
           console.log('Error searching teams:', error);
        }

        const result = {
            players: playerResults,
            teams: teamResults
        };

        // Cache the result
        searchCache.set(queryLower, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
       console.log(`Error searching for query '${query}':`, error);
        return null;
    }
}