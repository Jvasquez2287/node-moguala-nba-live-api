"use strict";
/**
 * Players service for NBA player operations.
 * Handles fetching player details, stats, and game logs.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayer = getPlayer;
exports.searchPlayers = searchPlayers;
exports.getSeasonLeaders = getSeasonLeaders;
exports.getLeagueRoster = getLeagueRoster;
const axios_1 = __importDefault(require("axios"));
const dataCache_1 = require("./dataCache");
// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 3600000;
// Cache for individual player lookups
const playerCache = new Map();
// Cache for player search results
const playerSearchCache = new Map();
/**
 * Retry utility for NBA API calls with exponential backoff
 */
async function retryAxiosRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        }
        catch (error) {
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
    throw lastError;
}
/**
 * Get player information including stats and recent games
 */
async function getPlayer(playerId) {
    try {
        const playerIdNum = parseInt(playerId, 10);
        if (isNaN(playerIdNum)) {
            throw new Error('Invalid player ID');
        }
        // Check cache first
        const cached = playerCache.get(playerId);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Returning cached player data for player ${playerId}`);
            return cached.data;
        }
        console.log(`Cache miss for player ${playerId}, fetching from API`);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
        // Get player details from PlayerIndex endpoint
        const playerResponse = await retryAxiosRequest(async () => {
            const response = await axios_1.default.get('https://stats.nba.com/stats/playerindex', {
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
                },
                params: {
                    LeagueID: '00',
                    Season: season,
                    Historical: 1 // Include historical data
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response.data;
        });
        if (!playerResponse?.resultSets?.[0]?.rowSet) {
            throw new Error(`Player not found with ID: ${playerId}`);
        }
        const playerData = playerResponse.resultSets[0].rowSet.find((row) => row[0] === playerIdNum);
        if (!playerData) {
            throw new Error(`Player not found with ID: ${playerId}`);
        }
        const headers = playerResponse.resultSets[0].headers;
        // Extract player data using header indices
        const getValue = (headerName) => {
            const index = headers.indexOf(headerName);
            return index !== -1 ? playerData[index] : null;
        };
        // Get recent games using PlayerGameLog
        const recentGames = [];
        try {
            const gameLogData = await retryAxiosRequest(async () => {
                const response = await axios_1.default.get('https://stats.nba.com/stats/playergamelog', {
                    params: {
                        PlayerID: playerIdNum,
                        Season: season,
                        SeasonType: 'Regular Season',
                        LeagueID: '00'
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
                    timeout: 60000 // Increased timeout to 60 seconds
                });
                return response.data;
            });
            if (gameLogData?.resultSets?.[0]?.rowSet) {
                const gameHeaders = gameLogData.resultSets[0].headers;
                const gameRows = gameLogData.resultSets[0].rowSet.slice(0, 5); // Last 5 games
                for (const row of gameRows) {
                    const gameId = row[gameHeaders.indexOf('Game_ID')];
                    const gameDate = row[gameHeaders.indexOf('GAME_DATE')];
                    const matchup = row[gameHeaders.indexOf('MATCHUP')];
                    const pts = row[gameHeaders.indexOf('PTS')] || 0;
                    const reb = row[gameHeaders.indexOf('REB')] || 0;
                    const ast = row[gameHeaders.indexOf('AST')] || 0;
                    const stl = row[gameHeaders.indexOf('STL')] || 0;
                    const blk = row[gameHeaders.indexOf('BLK')] || 0;
                    // Extract opponent abbreviation from matchup (e.g., "LAL @ PHX" -> "PHX")
                    let opponentAbbrev = '';
                    if (matchup) {
                        const parts = matchup.split(' ');
                        opponentAbbrev = parts[parts.length - 1];
                    }
                    recentGames.push({
                        game_id: String(gameId),
                        date: gameDate,
                        opponent_team_abbreviation: opponentAbbrev,
                        points: pts,
                        rebounds: reb,
                        assists: ast,
                        steals: stl,
                        blocks: blk
                    });
                }
            }
        }
        catch (error) {
            console.log(`Could not fetch recent games for player ${playerId}:`, error);
        }
        const playerSummary = {
            PERSON_ID: getValue('PERSON_ID') || playerIdNum,
            PLAYER_LAST_NAME: getValue('PLAYER_LAST_NAME') || '',
            PLAYER_FIRST_NAME: getValue('PLAYER_FIRST_NAME') || '',
            PLAYER_SLUG: getValue('PLAYER_SLUG'),
            TEAM_ID: getValue('TEAM_ID'),
            TEAM_SLUG: getValue('TEAM_SLUG'),
            IS_DEFUNCT: getValue('IS_DEFUNCT'),
            TEAM_CITY: getValue('TEAM_CITY'),
            TEAM_NAME: getValue('TEAM_NAME'),
            TEAM_ABBREVIATION: getValue('TEAM_ABBREVIATION'),
            JERSEY_NUMBER: getValue('JERSEY_NUMBER'),
            POSITION: getValue('POSITION'),
            HEIGHT: getValue('HEIGHT'),
            WEIGHT: getValue('WEIGHT'),
            COLLEGE: getValue('COLLEGE'),
            COUNTRY: getValue('COUNTRY'),
            ROSTER_STATUS: getValue('ROSTER_STATUS') || 'Active',
            PTS: getValue('PTS') || 0,
            REB: getValue('REB') || 0,
            AST: getValue('AST') || 0,
            STL: getValue('STL') || 0,
            BLK: getValue('BLK') || 0,
            STATS_TIMEFRAME: season,
            FROM_YEAR: getValue('FROM_YEAR'),
            TO_YEAR: getValue('TO_YEAR'),
            recent_games: recentGames
        };
        // Cache the result
        playerCache.set(playerId, {
            data: playerSummary,
            timestamp: Date.now()
        });
        return playerSummary;
    }
    catch (error) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.log(`NBA API timeout error for player ${playerId}: Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        }
        else if (error.response?.status === 429) {
            console.log(`NBA API rate limit exceeded for player ${playerId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        }
        else if (error.response?.status >= 500) {
            console.log(`NBA API server error for player ${playerId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        }
        else if (error.response?.status >= 400) {
            console.log(`NBA API client error for player ${playerId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log(`NBA API network error for player ${playerId}: ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        }
        else {
            console.log(`Unexpected error fetching player ${playerId}:`, error.message || error);
            throw new Error(`Failed to fetch player: ${error.message || error}`);
        }
    }
}
/**
 * Search for players by name
 */
async function searchPlayers(query) {
    try {
        // Check cache first
        const cached = playerSearchCache.get(query.toLowerCase());
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Returning cached search results for query "${query}"`);
            return cached.data;
        }
        console.log(`Cache miss for player search "${query}", fetching from API`);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
        const playersResponse = await retryAxiosRequest(async () => {
            const response = await axios_1.default.get('https://stats.nba.com/stats/playerindex', {
                params: {
                    LeagueID: '00',
                    Season: season,
                    Historical: 1 // Include historical data
                },
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
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response.data;
        });
        if (!playersResponse?.resultSets?.[0]?.rowSet) {
            return [];
        }
        const headers = playersResponse.resultSets[0].headers;
        const allPlayers = playersResponse.resultSets[0].rowSet;
        // Filter players by name (case-insensitive search)
        const queryLower = query.toLowerCase();
        const filteredPlayers = allPlayers.filter((row) => {
            const firstName = String(row[headers.indexOf('PLAYER_FIRST_NAME')] || '').toLowerCase();
            const lastName = String(row[headers.indexOf('PLAYER_LAST_NAME')] || '').toLowerCase();
            return firstName.includes(queryLower) || lastName.includes(queryLower);
        }).slice(0, 50); // Limit to 50 results
        const players = filteredPlayers.map((row) => {
            const getValue = (headerName) => {
                const index = headers.indexOf(headerName);
                return index !== -1 ? row[index] : null;
            };
            return {
                PERSON_ID: getValue('PERSON_ID'),
                PLAYER_LAST_NAME: getValue('PLAYER_LAST_NAME') || '',
                PLAYER_FIRST_NAME: getValue('PLAYER_FIRST_NAME') || '',
                PLAYER_SLUG: getValue('PLAYER_SLUG'),
                TEAM_ID: getValue('TEAM_ID'),
                TEAM_SLUG: getValue('TEAM_SLUG'),
                IS_DEFUNCT: getValue('IS_DEFUNCT'),
                TEAM_CITY: getValue('TEAM_CITY'),
                TEAM_NAME: getValue('TEAM_NAME'),
                TEAM_ABBREVIATION: getValue('TEAM_ABBREVIATION'),
                JERSEY_NUMBER: getValue('JERSEY_NUMBER'),
                POSITION: getValue('POSITION'),
                HEIGHT: getValue('HEIGHT'),
                WEIGHT: getValue('WEIGHT'),
                COLLEGE: getValue('COLLEGE'),
                COUNTRY: getValue('COUNTRY'),
                ROSTER_STATUS: getValue('ROSTER_STATUS') || 'Active',
                PTS: getValue('PTS') || 0,
                REB: getValue('REB') || 0,
                AST: getValue('AST') || 0,
                STL: getValue('STL') || 0,
                BLK: getValue('BLK') || 0,
                STATS_TIMEFRAME: season,
                FROM_YEAR: getValue('FROM_YEAR'),
                TO_YEAR: getValue('TO_YEAR'),
                recent_games: []
            };
        });
        // Cache the result
        playerSearchCache.set(query.toLowerCase(), {
            data: players,
            timestamp: Date.now()
        });
        return players;
    }
    catch (error) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.log(`NBA API timeout error for player search "${query}": Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        }
        else if (error.response?.status === 429) {
            console.log(`NBA API rate limit exceeded for player search "${query}": ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        }
        else if (error.response?.status >= 500) {
            console.log(`NBA API server error for player search "${query}": ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        }
        else if (error.response?.status >= 400) {
            console.log(`NBA API client error for player search "${query}": ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log(`NBA API network error for player search "${query}": ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        }
        else {
            console.log(`Unexpected error searching players with query "${query}":`, error.message || error);
            throw new Error(`Failed to search players: ${error.message || error}`);
        }
    }
}
/**
 * Get season leaders for various stat categories
 */
async function getSeasonLeaders(season = "2024-25") {
    try {
        // Check cache first
        const seasonParts = season.split('-');
        const nbaSeasonFormat = `${seasonParts[1]}/${seasonParts[2]}/${seasonParts[0]}`;
        const cachedData = await dataCache_1.dataCache.getSeasonLeaders(season);
        if (cachedData && cachedData !== null) {
            console.log(`Returning cached season leaders for ${season}`);
            return cachedData;
        }
        console.log(`Cache miss for season leaders ${season}, fetching from API`);
        const playersResponse = await retryAxiosRequest(async () => {
            const response = await axios_1.default.get('https://stats.nba.com/stats/leaguedashplayerstats', {
                params: {
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
                    Season: season,
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
                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response;
        });
        if (playersResponse.data?.resultSets?.[0]?.rowSet === undefined || playersResponse.data.resultSets[0].rowSet.length === 0 || playersResponse.data.resultSets[0].headers === undefined ||
            playersResponse.data.resultSets[0].rowSet.length === 0 || playersResponse.data.resultSets[0].headers.length === 0) {
            return {
                season,
                categories: [
                    { category: "Points Per Game", leaders: [] },
                    { category: "Rebounds Per Game", leaders: [] },
                    { category: "Assists Per Game", leaders: [] },
                    { category: "Steals Per Game", leaders: [] },
                    { category: "Blocks Per Game", leaders: [] },
                    { category: "Field Goal Percentage", leaders: [] },
                    { category: "Three Pointers Made", leaders: [] },
                    { category: "Three Point Percentage", leaders: [] }
                ]
            };
        }
        const headers = playersResponse.data.resultSets[0].headers;
        const allPlayers = playersResponse.data.resultSets[0].rowSet;
        // Helper function to create leaders for a stat
        const createLeaders = (statCol, categoryName, topN = 5, isPercentage = false, isWholeNumber = false) => {
            const colIndex = headers.indexOf(statCol);
            if (colIndex === -1) {
                return { category: categoryName, leaders: [] };
            }
            // Filter players with games played > 0 and sort by stat
            const filteredPlayers = allPlayers
                .filter((row) => {
                const gp = row[headers.indexOf('GP')];
                return gp && gp > 0;
            })
                .sort((a, b) => {
                const aVal = parseFloat(a[colIndex]) || 0;
                const bVal = parseFloat(b[colIndex]) || 0;
                return bVal - aVal; // Descending order
            })
                .slice(0, topN);
            const leaders = filteredPlayers.map((row) => {
                const playerId = row[headers.indexOf('PLAYER_ID')];
                const playerName = row[headers.indexOf('PLAYER_NAME')];
                const teamAbbrev = row[headers.indexOf('TEAM_ABBREVIATION')];
                const value = parseFloat(row[colIndex]) || 0;
                // Format value based on type
                let formattedValue;
                if (isPercentage) {
                    formattedValue = value <= 1 ? Math.round(value * 100 * 10) / 10 : Math.round(value * 10) / 10;
                }
                else if (isWholeNumber) {
                    formattedValue = Math.round(value);
                }
                else {
                    formattedValue = Math.round(value * 10) / 10;
                }
                return {
                    player_id: playerId,
                    player_name: playerName,
                    team_abbreviation: teamAbbrev,
                    position: undefined, // Not available in this endpoint
                    value: formattedValue
                };
            });
            return { category: categoryName, leaders };
        };
        const categories = [
            createLeaders('PTS', 'Points Per Game'),
            createLeaders('REB', 'Rebounds Per Game'),
            createLeaders('AST', 'Assists Per Game'),
            createLeaders('STL', 'Steals Per Game'),
            createLeaders('BLK', 'Blocks Per Game'),
            createLeaders('FG_PCT', 'Field Goal Percentage', 5, true),
            createLeaders('FG3M', 'Three Pointers Made', 5, false, true),
            createLeaders('FG3_PCT', 'Three Point Percentage', 5, true)
        ];
        const result = {
            season,
            categories
        };
        // Cache the result
        dataCache_1.dataCache.setSeasonLeaders(season, result);
        return result;
    }
    catch (error) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.log(`NBA API timeout error for season leaders (${season}): Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        }
        else if (error.response?.status === 429) {
            console.log(`NBA API rate limit exceeded for season leaders (${season}): ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        }
        else if (error.response?.status >= 500) {
            console.log(`NBA API server error for season leaders (${season}): ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        }
        else if (error.response?.status >= 400) {
            console.log(`NBA API client error for season leaders (${season}): ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log(`NBA API network error for season leaders (${season}): ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        }
        else {
            console.log(`Unexpected error fetching season leaders for season ${season}:`, error.message || error);
            throw new Error(`Failed to fetch season leaders: ${error.message || error}`);
        }
    }
}
/**
 * Get the complete league roster (all active players)
 */
async function getLeagueRoster() {
    try {
        // Check cache first
        const cachedData = await dataCache_1.dataCache.getLeagueRoster();
        if (cachedData) {
            console.log(`Returning cached league roster`);
            return cachedData;
        }
        console.log(`Cache miss for league roster, fetching from API`);
        // Get current season
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
        const playersResponse = await retryAxiosRequest(async () => {
            const response = await axios_1.default.get('https://stats.nba.com/stats/playerindex', {
                params: {
                    LeagueID: '00',
                    Season: season,
                    Historical: 1 // Include historical data
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
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response;
        });
        if (!playersResponse.data?.resultSets?.[0]?.rowSet) {
            return [];
        }
        const headers = playersResponse.data.resultSets[0].headers;
        const allPlayers = playersResponse.data.resultSets[0].rowSet;
        // Filter for active players (ROSTER_STATUS == 1)
        const activePlayers = allPlayers.filter((row) => {
            const rosterStatus = row[headers.indexOf('ROSTER_STATUS')];
            return rosterStatus === 1 || rosterStatus === '1';
        });
        const players = activePlayers.map((row) => {
            const getValue = (headerName) => {
                const index = headers.indexOf(headerName);
                return index !== -1 ? row[index] : null;
            };
            // Helper function to safely parse values
            const safeInt = (value, defaultValue = 0) => {
                if (value === null || value === undefined || value === '')
                    return defaultValue;
                const num = Number(value);
                return isNaN(num) ? defaultValue : num;
            };
            const safeFloat = (value, defaultValue = 0) => {
                if (value === null || value === undefined || value === '')
                    return defaultValue;
                const num = Number(value);
                return isNaN(num) ? defaultValue : num;
            };
            const safeStr = (value, defaultValue = '') => {
                if (value === null || value === undefined)
                    return defaultValue;
                return String(value).trim() || defaultValue;
            };
            return {
                PERSON_ID: safeInt(getValue('PERSON_ID'), 0),
                PLAYER_LAST_NAME: safeStr(getValue('PLAYER_LAST_NAME'), ''),
                PLAYER_FIRST_NAME: safeStr(getValue('PLAYER_FIRST_NAME'), ''),
                PLAYER_SLUG: getValue('PLAYER_SLUG'),
                TEAM_ID: safeInt(getValue('TEAM_ID')),
                TEAM_SLUG: getValue('TEAM_SLUG'),
                IS_DEFUNCT: safeInt(getValue('IS_DEFUNCT')),
                TEAM_CITY: safeStr(getValue('TEAM_CITY')),
                TEAM_NAME: safeStr(getValue('TEAM_NAME')),
                TEAM_ABBREVIATION: safeStr(getValue('TEAM_ABBREVIATION')),
                JERSEY_NUMBER: safeStr(getValue('JERSEY_NUMBER')),
                POSITION: safeStr(getValue('POSITION')),
                HEIGHT: safeStr(getValue('HEIGHT')),
                WEIGHT: safeInt(getValue('WEIGHT')),
                COLLEGE: safeStr(getValue('COLLEGE')),
                COUNTRY: safeStr(getValue('COUNTRY')),
                ROSTER_STATUS: safeStr(getValue('ROSTER_STATUS'), ''),
                PTS: safeFloat(getValue('PTS'), 0),
                REB: safeFloat(getValue('REB'), 0),
                AST: safeFloat(getValue('AST'), 0),
                STL: safeFloat(getValue('STL'), 0),
                BLK: safeFloat(getValue('BLK'), 0),
                STATS_TIMEFRAME: season,
                FROM_YEAR: safeInt(getValue('FROM_YEAR')),
                TO_YEAR: safeInt(getValue('TO_YEAR')),
                recent_games: []
            };
        });
        // Cache the result
        dataCache_1.dataCache.setLeagueRoster(players);
        return players;
    }
    catch (error) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            console.log(`NBA API timeout error for league roster: Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        }
        else if (error.response?.status === 429) {
            console.log(`NBA API rate limit exceeded for league roster: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        }
        else if (error.response?.status >= 500) {
            console.log(`NBA API server error for league roster: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        }
        else if (error.response?.status >= 400) {
            console.log(`NBA API client error for league roster: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log(`NBA API network error for league roster: ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        }
        else {
            console.log('Unexpected error fetching league roster:', error.message || error);
            throw new Error(`Failed to fetch league roster: ${error.message || error}`);
        }
    }
}
//# sourceMappingURL=players.js.map