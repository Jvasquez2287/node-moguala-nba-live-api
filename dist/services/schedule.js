"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleService = void 0;
exports.getGamesForDate = getGamesForDate;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../utils/config");
const dataCache_1 = require("./dataCache");
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
// Create a map of team IDs to abbreviations for quick lookup
// This helps us convert team IDs to abbreviations like "LAL" or "BOS"
const NBA_TEAMS = {
    1610612737: "ATL",
    1610612738: "BOS",
    1610612739: "CLE",
    1610612740: "NOP",
    1610612741: "CHI",
    1610612742: "DAL",
    1610612743: "DEN",
    1610612744: "GSW",
    1610612745: "HOU",
    1610612746: "LAC",
    1610612747: "LAL",
    1610612748: "MIA",
    1610612749: "MIL",
    1610612750: "MIN",
    1610612751: "BKN",
    1610612752: "NYK",
    1610612753: "ORL",
    1610612754: "IND",
    1610612755: "PHI",
    1610612756: "PHX",
    1610612757: "POR",
    1610612758: "SAC",
    1610612759: "SAS",
    1610612760: "OKC",
    1610612761: "TOR",
    1610612762: "UTA",
    1610612763: "MEM",
    1610612764: "WAS",
    1610612765: "DET",
    1610612766: "CHA"
};
/**
 * Parse game time from game_status string (e.g., "7:00 pm ET") and convert to UTC ISO format.
 */
function parseGameTimeFromStatus(gameStatus, gameDate) {
    if (!gameStatus || !gameDate) {
        return null;
    }
    // Pattern to match time formats like "7:00 pm ET", "7:30 pm ET", "12:00 pm ET"
    // Also handles "7 pm ET" (without minutes)
    const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*ET/i;
    const match = gameStatus.match(timePattern);
    if (!match) {
        return null;
    }
    try {
        let hour = parseInt(match[1], 10);
        const minute = match[2] ? parseInt(match[2], 10) : 0;
        const amPm = match[3].toLowerCase();
        // Convert to 24-hour format
        if (amPm === 'pm' && hour !== 12) {
            hour += 12;
        }
        else if (amPm === 'am' && hour === 12) {
            hour = 0;
        }
        // Parse the game date
        const dateObj = new Date(gameDate);
        // Create datetime in ET timezone (UTC-5, or UTC-4 during DST)
        // For simplicity, we'll assume standard time (ET = UTC-5)
        const etTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hour, minute);
        const etOffset = -5 * 60; // ET is UTC-5 (in minutes)
        const utcTime = new Date(etTime.getTime() - (etOffset * 60 * 1000));
        // Format as ISO 8601 UTC string
        return utcTime.toISOString();
    }
    catch (error) {
        console.log(`Error parsing game time from status '${gameStatus}':`, error);
        return null;
    }
}
function extractGameLeaders(teamLeadersList, teamLeadersHeaders, gameId, homeTeamId, awayTeamId) {
    if (!teamLeadersList || !teamLeadersHeaders) {
        return undefined;
    }
    let homeLeader;
    let awayLeader;
    // Find leaders for this game
    for (const leaderRow of teamLeadersList) {
        if (teamLeadersHeaders.length !== leaderRow.length) {
            continue;
        }
        const leaderDict = {};
        for (let i = 0; i < teamLeadersHeaders.length; i++) {
            leaderDict[teamLeadersHeaders[i]] = leaderRow[i];
        }
        if (String(leaderDict.GAME_ID || '') !== gameId) {
            continue;
        }
        const teamId = leaderDict.TEAM_ID;
        const playerId = leaderDict.PTS_PLAYER_ID || 0;
        const playerName = leaderDict.PTS_PLAYER_NAME || 'Unknown';
        if (!playerId || playerId === 0) {
            continue;
        }
        // Use game stats directly from TeamLeaders
        const leaderData = {
            personId: playerId,
            name: playerName,
            jerseyNum: leaderDict.PTS_PLAYER_JERSEY_NUM ? String(leaderDict.PTS_PLAYER_JERSEY_NUM) : undefined,
            position: leaderDict.PTS_PLAYER_POSITION,
            teamTricode: NBA_TEAMS[teamId] || '',
            points: parseFloat(leaderDict.PTS || 0),
            rebounds: parseFloat(leaderDict.REB || 0),
            assists: parseFloat(leaderDict.AST || 0),
        };
        if (teamId === homeTeamId) {
            homeLeader = leaderData;
        }
        else if (teamId === awayTeamId) {
            awayLeader = leaderData;
        }
    }
    if (homeLeader || awayLeader) {
        return {
            homeLeaders: homeLeader,
            awayLeaders: awayLeader
        };
    }
    return undefined;
}
// Cache for schedule data
let scheduleCache = null;
let scheduleCacheTimestamp = 0;
const SCHEDULE_CACHE_TTL = 3600 * 1000; // Memory cache for 1 hour for performance; DB stores permanently
const SCHEDULE_URL = 'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json';
async function fetchNBASchedule() {
    try {
        const proxyConfig = config_1.config.getApiProxyConfig();
        const axiosConfig = {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        if (proxyConfig) {
            axiosConfig.proxy = proxyConfig;
        }
        const response = await axios_1.default.get(SCHEDULE_URL, axiosConfig);
        let data = response.data;
        // Handle different response types
        if (typeof data === 'string') {
            // If it's a string, try to parse as JSON
            try {
                data = JSON.parse(data);
            }
            catch (e) {
                // If JSON parse fails, try to extract from HTML
                if (data.includes('<pre')) {
                    const jsonMatch = data.match(/<pre[^>]*>(.*?)<\/pre>/s);
                    if (jsonMatch) {
                        data = JSON.parse(jsonMatch[1]);
                    }
                    else {
                        throw new Error('Could not extract JSON from HTML pre tags');
                    }
                }
                else if (data.includes('<html') || data.includes('<!DOCTYPE')) {
                    throw new Error('Received HTML response instead of JSON');
                }
                else {
                    throw e;
                }
            }
        }
        // Store the games in the cached data structure for easier access later (local database) for 24H
        let games = data.leagueSchedule?.gameDates || [];
        data.league = {
            season: data.leagueSchedule?.seasonId,
            games: games
        };
        console.log('\n==============================================');
        console.log('Fetched NBA schedule data from CDN');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Data structure:`, Object.keys(data));
        console.log(`Number of games:`, data.league?.games.length || 'N/A');
        console.log('==============================================\n');
        return data;
    }
    catch (error) {
        console.error('Error fetching NBA schedule:', error instanceof Error ? error.message : error);
        throw new Error('Failed to fetch NBA schedule');
    }
}
function parseScheduleData(rawData) {
    const season = rawData.league?.season || new Date().getFullYear();
    const games = rawData.league?.games || [];
    return {
        season,
        games,
        lastUpdated: new Date().toISOString()
    };
}
async function getSchedule() {
    const currentTime = Date.now();
    // 1. Check memory cache first (1 hour TTL for performance)
    if (scheduleCache && (currentTime - scheduleCacheTimestamp) < SCHEDULE_CACHE_TTL) {
        console.log('[Schedule] Returning cached schedule data from memory');
        return scheduleCache;
    }
    // 2. Check database cache (permanent storage - no TTL)
    try {
        console.log('[Schedule] Checking database cache...');
        const cachedData = await dataCache_1.dataCache.getScheduleData();
        if (cachedData) {
            console.log(`[Schedule] Found schedule data in database cache with ${cachedData.games.length} games`);
            scheduleCache = cachedData;
            scheduleCacheTimestamp = currentTime;
            return cachedData;
        }
    }
    catch (error) {
        console.warn('[Schedule] Database cache lookup failed, will fetch from API:', error instanceof Error ? error.message : error);
    }
    // 3. Fetch fresh data from API
    try {
        console.log('[Schedule] Fetching fresh schedule data from API');
        const rawData = await fetchNBASchedule();
        scheduleCache = parseScheduleData(rawData);
        scheduleCacheTimestamp = currentTime;
        console.log(`[Schedule] Successfully fetched schedule with ${scheduleCache.games.length} games`);
        // 4. Store in database cache permanently
        try {
            dataCache_1.dataCache.setScheduleData(scheduleCache);
            console.log('[Schedule] Stored schedule data in database cache (permanent storage)');
        }
        catch (cacheError) {
            console.warn('[Schedule] Failed to store in database cache:', cacheError instanceof Error ? cacheError.message : cacheError);
            // Continue anyway - we still have the data in memory
        }
        return scheduleCache;
    }
    catch (error) {
        // Return cached data even if expired, as fallback
        if (scheduleCache) {
            console.warn('[Schedule] Using cached data as fallback');
            return scheduleCache;
        }
        throw error;
    }
}
async function getSchedules() {
    const schedule = await getSchedule();
    if (schedule && schedule.games) {
        const allSchedules = schedule.games.map(gameDate => {
            let gameDateStr;
            if (typeof gameDate.gameDate === 'string') {
                // Remove time portion if present (e.g., "MM/DD/YYYY 00:00:00" -> "MM/DD/YYYY")
                const dateOnly = gameDate.gameDate.split(' ')[0];
                // Convert MM/DD/YYYY to YYYY-MM-DD
                const parts = dateOnly.split('/');
                if (parts.length === 3) {
                    const [month, day, year] = parts;
                    gameDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                else {
                    gameDateStr = dateOnly; // Already in correct format
                }
            }
            else {
                // Convert date to ISO format YYYY-MM-DD
                gameDateStr = new Date(gameDate.gameDate).toISOString().split('T')[0];
            }
            return {
                gameDate: gameDateStr,
                games: gameDate.games ? formatGameResponse(gameDate.games) : []
            };
        });
        return allSchedules;
    }
    return [];
}
async function getTodaysSchedule() {
    try {
        const schedule = await getSchedule();
        const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        // Find today's game date entry
        const todayGameDate = schedule.games.find(gameDate => {
            if (!gameDate.gameDate)
                return false;
            let gameDateStr;
            if (typeof gameDate.gameDate === 'string') {
                // Remove time portion if present (e.g., "MM/DD/YYYY 00:00:00" -> "MM/DD/YYYY")
                const dateOnly = gameDate.gameDate.split(' ')[0];
                // Convert MM/DD/YYYY to YYYY-MM-DD
                const parts = dateOnly.split('/');
                if (parts.length === 3) {
                    const [month, day, year] = parts;
                    gameDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                else {
                    gameDateStr = dateOnly; // Already in correct format
                }
            }
            else {
                // Convert date to ISO format YYYY-MM-DD
                gameDateStr = new Date(gameDate.gameDate).toISOString().split('T')[0];
            }
            return gameDateStr === todayDate;
        });
        if (todayGameDate) {
            return {
                gameDate: todayDate,
                games: todayGameDate.games ? formatGameResponse(todayGameDate.games) : []
            };
        }
        // Return empty games for today if none found
        console.log('[Schedule] No games found for today:', todayDate);
        return {
            gameDate: todayDate,
            games: []
        };
    }
    catch (error) {
        console.error('[Schedule] Error getting today\'s games:', error instanceof Error ? error.message : error);
        throw error;
    }
}
async function getScheduleByDate(date) {
    try {
        const schedule = await getSchedule();
        // Find game date entry matching the provided date
        const gameDateEntry = schedule.games.find(gameDate => {
            if (!gameDate.gameDate)
                return false;
            let gameDateStr;
            if (typeof gameDate.gameDate === 'string') {
                // Remove time portion if present (e.g., "MM/DD/YYYY 00:00:00" -> "MM/DD/YYYY")
                const dateOnly = gameDate.gameDate.split(' ')[0];
                // Convert MM/DD/YYYY to YYYY-MM-DD
                const parts = dateOnly.split('/');
                if (parts.length === 3) {
                    const [month, day, year] = parts;
                    gameDateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                else {
                    gameDateStr = dateOnly; // Already in correct format
                }
            }
            else {
                // Convert date to ISO format YYYY-MM-DD
                gameDateStr = new Date(gameDate.gameDate).toISOString().split('T')[0];
            }
            return gameDateStr.includes(date);
        });
        if (gameDateEntry) {
            return {
                gameDate: date,
                games: gameDateEntry.games ? formatGameResponse(gameDateEntry.games) : []
            };
        }
        // Return empty games for the specified date if none found
        console.log('[Schedule] No games found for date:', date);
        return {
            gameDate: date,
            games: []
        };
    }
    catch (error) {
        console.error('[Schedule] Error getting games by date:', error instanceof Error ? error.message : error);
        throw error;
    }
}
async function refreshSchedule() {
    try {
        console.log('[Schedule] Manually refreshing schedule data');
        const rawData = await fetchNBASchedule();
        scheduleCache = parseScheduleData(rawData);
        scheduleCacheTimestamp = Date.now();
        console.log(`[Schedule] Successfully refreshed schedule with ${scheduleCache.games.length} games`);
        return scheduleCache;
    }
    catch (error) {
        console.error('[Schedule] Error refreshing schedule:', error instanceof Error ? error.message : error);
        throw error;
    }
}
function clearScheduleCache() {
    scheduleCache = null;
    scheduleCacheTimestamp = 0;
    console.log('[Schedule] Cache cleared');
}
// {"arena": "Chase Center", "away_team": {"points": 126, "team_abbreviation": "SAS", "team_id": 1610612759}, "gameLeaders": {"awayLeaders": {"assists": 8, "name": "De'Aaron Fox", "personId": 1628368, "points": 27, "rebounds": 9, "teamTricode": "SAS"}, "homeLeaders": {"assists": 8, "name": "Draymond Green", "personId": 203110, "points": 17, "rebounds": 12, "teamTricode": "GSW"}}, "game_date": "2026-02-11", "game_id": "0022500788", "game_status": "Final", "game_time_utc": null, "home_team": {"points": 113, "team_abbreviation": "GSW", "team_id": 1610612744}, "matchup": "GSW vs SAS", "top_scorer": {"assists": 8, "player_id": 203110, "player_name": "Draymond Green", "points": 17, "rebounds": 12, "team_id": 1610612744}}
function formatGameResponse(games) {
    return games.map((game) => ({
        gameId: game.gameId,
        gameStatus: game.gameStatus || 0,
        gameStatusText: game.gameStatusText || '',
        period: game.period || 0,
        gameClock: game.gameClock || null,
        gameTimeUTC: game.gameTimeUTC || '',
        home_Team: {
            teamId: game.homeTeam?.teamId,
            teamName: game.homeTeam?.teamName || '',
            teamCity: game.homeTeam?.teamCity || '',
            teamTricode: game.homeTeam?.teamTricode || '',
            wins: game.homeTeam?.wins || 0,
            losses: game.homeTeam?.losses || 0,
            score: game.homeTeam?.score || 0,
            timeoutsRemaining: game.homeTeam?.timeoutsRemaining || 0,
            periods: (Array.isArray(game.homeTeam?.periods) && game.homeTeam.periods.length > 0) ? game.homeTeam.periods.map((p) => ({
                period: p.period,
                score: p.score
            })) : []
        },
        away_Team: {
            teamId: game.awayTeam?.teamId,
            teamName: game.awayTeam?.teamName || '',
            teamCity: game.awayTeam?.teamCity || '',
            teamTricode: game.awayTeam?.teamTricode || '',
            wins: game.awayTeam?.wins || 0,
            losses: game.awayTeam?.losses || 0,
            score: game.awayTeam?.score || 0,
            timeoutsRemaining: game.awayTeam?.timeoutsRemaining || 0,
            periods: (Array.isArray(game.awayTeam?.periods) && game.awayTeam.periods.length > 0) ? game.awayTeam.periods.map((p) => ({
                period: p.period,
                score: p.score
            })) : []
        },
        gameLeaders: game.pointsLeaders || null
    }));
}
exports.scheduleService = {
    getSchedules,
    getTodaysSchedule,
    getScheduleByDate,
    refreshSchedule,
    clearScheduleCache
};
/**
 * Get all NBA games for a specific date
 */
async function getGamesForDate(date) {
    try {
        // Check cache first
        const cachedData = await dataCache_1.dataCache.getGamesForDate(date);
        if (cachedData) {
            console.log(`Returning cached games for date ${date}`);
            return cachedData;
        }
        console.log(`Cache miss for games on ${date}, fetching from API`);
        // Get game data from NBA API for the specified date
        const data = await retryAxiosRequest(async () => {
            // Convert date from YYYY-MM-DD to MM/DD/YYYY format for NBA API
            const dateParts = date.split('-');
            const nbaDateFormat = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
            const response = await axios_1.default.get('https://stats.nba.com/stats/scoreboardv2', {
                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                }, params: {
                    DayOffset: 0,
                    GameDate: nbaDateFormat,
                    LeagueID: '00'
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response.data;
        });
        console.log(`\n\n\nSuccessfully fetched games for date ${date} from API\n\n\n`);
        // Check if we got valid data
        if (!data.resultSets || !data.resultSets.length) {
            throw new Error(`No game data found for ${date}`);
        }
        // Extract different parts of the game data
        const gameHeaderData = data.resultSets.find((r) => r.name === 'GameHeader');
        const teamLeadersData = data.resultSets.find((r) => r.name === 'TeamLeaders');
        const lineScoreData = data.resultSets.find((r) => r.name === 'LineScore');
        // If no game header data, return empty response
        if (!gameHeaderData || !gameHeaderData.rowSet) {
            console.log(`No game header data found for date ${date}`);
            return { date, games: [] };
        }
        // Get the column names and game data
        const gameHeaders = gameHeaderData.headers;
        const gamesList = gameHeaderData.rowSet;
        // Log number of games found
        if (gamesList && gamesList.length > 0) {
            console.log(`Found ${gamesList.length} games for date ${date}`);
        }
        // Get headers and data for team leaders and scores (if available)
        const teamLeadersHeaders = teamLeadersData?.headers || [];
        const teamLeadersList = teamLeadersData?.rowSet || [];
        const lineScoreHeaders = lineScoreData?.headers || [];
        const lineScoreList = lineScoreData?.rowSet || [];
        const games = [];
        const processedGameIds = new Set();
        // Process each game
        for (const game of gamesList) {
            try {
                // Validate that headers and game row have the same length
                if (gameHeaders.length !== game.length) {
                    console.log(`Game row length (${game.length}) doesn't match headers length (${gameHeaders.length}), skipping`);
                    continue;
                }
                // Convert the game data to a dictionary
                const gameDict = {};
                for (let i = 0; i < gameHeaders.length; i++) {
                    if (i < game.length) {
                        gameDict[gameHeaders[i]] = game[i];
                    }
                }
                // Skip if game ID is missing
                if (!gameDict.GAME_ID) {
                    continue;
                }
                const gameId = String(gameDict.GAME_ID);
                // Skip if we've already processed this game (avoid duplicates)
                if (processedGameIds.has(gameId)) {
                    continue;
                }
                processedGameIds.add(gameId);
                let homeTeamId = gameDict.HOME_TEAM_ID;
                let awayTeamId = gameDict.VISITOR_TEAM_ID;
                // Skip if either team ID is missing
                if (homeTeamId === null || homeTeamId === undefined ||
                    awayTeamId === null || awayTeamId === undefined) {
                    continue;
                }
                // Make sure both IDs are numbers
                try {
                    homeTeamId = Number(homeTeamId);
                    awayTeamId = Number(awayTeamId);
                }
                catch (error) {
                    continue;
                }
                // Find the home team's score from the line score data
                const homeScore = lineScoreList.find((s) => {
                    if (lineScoreHeaders.length !== s.length)
                        return false;
                    const scoreDict = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = s[i];
                    }
                    return String(scoreDict.GAME_ID || '') === gameId && scoreDict.TEAM_ID === homeTeamId;
                });
                // Find the away team's score
                const awayScore = lineScoreList.find((s) => {
                    if (lineScoreHeaders.length !== s.length)
                        return false;
                    const scoreDict = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = s[i];
                    }
                    return String(scoreDict.GAME_ID || '') === gameId && scoreDict.TEAM_ID === awayTeamId;
                });
                const homePoints = homeScore ? (() => {
                    const scoreDict = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = homeScore[i];
                    }
                    return scoreDict.PTS || 0;
                })() : 0;
                const awayPoints = awayScore ? (() => {
                    const scoreDict = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = awayScore[i];
                    }
                    return scoreDict.PTS || 0;
                })() : 0;
                // Create TeamSummary objects for both teams
                const homeTeam = {
                    team_id: homeTeamId,
                    team_abbreviation: NBA_TEAMS[homeTeamId] || 'N/A',
                    points: homePoints
                };
                const awayTeam = {
                    team_id: awayTeamId,
                    team_abbreviation: NBA_TEAMS[awayTeamId] || 'N/A',
                    points: awayPoints
                };
                // Try to find the top scorer for this game
                let topScorer;
                try {
                    for (const leaderRow of teamLeadersList) {
                        if (teamLeadersHeaders.length !== leaderRow.length)
                            continue;
                        const leaderDict = {};
                        for (let i = 0; i < teamLeadersHeaders.length; i++) {
                            leaderDict[teamLeadersHeaders[i]] = leaderRow[i];
                        }
                        if (String(leaderDict.GAME_ID || '') !== gameId)
                            continue;
                        topScorer = {
                            player_id: leaderDict.PTS_PLAYER_ID || 0,
                            player_name: leaderDict.PTS_PLAYER_NAME || 'Unknown',
                            team_id: leaderDict.TEAM_ID || 0,
                            points: leaderDict.PTS || 0,
                            rebounds: leaderDict.REB || 0,
                            assists: leaderDict.AST || 0
                        };
                        break; // Found the top scorer, no need to continue
                    }
                }
                catch (error) {
                    console.log(`Error extracting top scorer for game ${gameId}:`, error);
                    topScorer = undefined;
                }
                // Extract game leaders
                let gameLeaders;
                const gameStatusText = gameDict.GAME_STATUS_TEXT || 'Unknown';
                const isUpcoming = !gameStatusText.toLowerCase().includes('final') &&
                    !gameStatusText.toLowerCase().includes('live') &&
                    homePoints === 0 && awayPoints === 0;
                // For completed/live games, get leaders from TeamLeaders data
                if (!isUpcoming) {
                    try {
                        gameLeaders = extractGameLeaders(teamLeadersList, teamLeadersHeaders, gameId, homeTeamId, awayTeamId);
                    }
                    catch (error) {
                        console.log(`Error extracting game leaders for game ${gameId}:`, error);
                        gameLeaders = undefined;
                    }
                }
                // Extract game time
                let gameTimeUtc = gameDict.GAME_TIME_UTC ||
                    gameDict.START_TIME_UTC ||
                    gameDict.GAME_DATE_TIME_UTC ||
                    gameDict.GAME_ET ||
                    null;
                // If game_time_utc is still null, try parsing from game_status
                if (!gameTimeUtc) {
                    gameTimeUtc = parseGameTimeFromStatus(gameStatusText, date);
                }
                // Create a GameSummary with all the game information
                games.push({
                    game_id: gameId,
                    game_date: date, // Use the requested date
                    game_time_utc: gameTimeUtc,
                    matchup: `${homeTeam.team_abbreviation} vs ${awayTeam.team_abbreviation}`,
                    game_status: gameStatusText,
                    arena: gameDict.ARENA_NAME,
                    home_team: homeTeam,
                    away_team: awayTeam,
                    top_scorer: topScorer,
                    gameLeaders: gameLeaders
                });
            }
            catch (error) {
                // If a key is missing, log and skip this game
                console.log(`Error processing game: ${error}, skipping. Game data keys: ${Object.keys(game).slice(0, 10)}`);
                continue;
            }
        }
        const result = { date, games };
        // Cache the result
        dataCache_1.dataCache.setGamesForDate(date, result);
        return result;
    }
    catch (error) {
        let errorMessage = `Failed to fetch games for date ${date}`;
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            errorMessage = `NBA API timeout - the service may be temporarily unavailable. Please try again later.`;
        }
        else if (error.response) {
            // API returned an error response
            const status = error.response.status;
            if (status === 429) {
                errorMessage = `NBA API rate limit exceeded. Please try again later.`;
            }
            else if (status >= 500) {
                errorMessage = `NBA API server error (${status}). Please try again later.`;
            }
            else {
                errorMessage = `NBA API error (${status}): ${error.response.data?.message || error.message}`;
            }
        }
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = `Network error - unable to connect to NBA API. Please check your internet connection.`;
        }
        console.log(`Error retrieving games for date ${date}:`, {
            error: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });
        throw new Error(errorMessage);
    }
}
//# sourceMappingURL=schedule.js.map