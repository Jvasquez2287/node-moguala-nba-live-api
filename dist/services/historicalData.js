"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistoricalGames = getHistoricalGames;
exports.getHistoricalBoxScore = getHistoricalBoxScore;
const axios_1 = __importDefault(require("axios"));
const STATS_NBA_API = 'https://stats.nba.com/stats/scoreboard';
const PYTHON_API = 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT = 10000;
// Rate limiting: 1 request per second
const RATE_LIMIT_DELAY = 100; // 100ms between requests
let lastRequestTime = 0;
async function enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
}
// Complete mapping of NBA team IDs to tricodes (all 30 teams)
// Source: Official NBA Stats API team IDs
const TEAM_ID_TO_TRICODE = {
    1610612737: 'ATL', // Atlanta Hawks
    1610612738: 'BOS', // Boston Celtics
    1610612739: 'CLE', // Cleveland Cavaliers
    1610612740: 'NOP', // New Orleans Pelicans
    1610612741: 'CHI', // Chicago Bulls
    1610612742: 'DAL', // Dallas Mavericks
    1610612743: 'DEN', // Denver Nuggets
    1610612744: 'GSW', // Golden State Warriors
    1610612745: 'HOU', // Houston Rockets
    1610612746: 'LAL', // Los Angeles Lakers
    1610612747: 'LAC', // Los Angeles Clippers
    1610612748: 'MIA', // Miami Heat
    1610612749: 'MIL', // Milwaukee Bucks
    1610612750: 'MIN', // Minnesota Timberwolves
    1610612751: 'BRK', // Brooklyn Nets
    1610612752: 'NYK', // New York Knicks
    1610612753: 'ORL', // Orlando Magic
    1610612754: 'IND', // Indiana Pacers
    1610612755: 'PHI', // Philadelphia 76ers
    1610612756: 'PHX', // Phoenix Suns
    1610612757: 'POR', // Portland Trail Blazers
    1610612758: 'SAC', // Sacramento Kings
    1610612759: 'SAS', // San Antonio Spurs
    1610612760: 'OKC', // Oklahoma City Thunder
    1610612761: 'TOR', // Toronto Raptors
    1610612762: 'UTA', // Utah Jazz
    1610612763: 'MEM', // Memphis Grizzlies
    1610612764: 'WAS', // Washington Wizards
    1610612765: 'DET', // Detroit Pistons
    1610612766: 'CHA' // Charlotte Hornets
};
const TEAM_NAMES = {
    'ATL': 'Atlanta Hawks',
    'BOS': 'Boston Celtics',
    'BRK': 'Brooklyn Nets',
    'CHA': 'Charlotte Hornets',
    'CHI': 'Chicago Bulls',
    'CLE': 'Cleveland Cavaliers',
    'DAL': 'Dallas Mavericks',
    'DEN': 'Denver Nuggets',
    'DET': 'Detroit Pistons',
    'GSW': 'Golden State Warriors',
    'HOU': 'Houston Rockets',
    'IND': 'Indiana Pacers',
    'LAC': 'Los Angeles Clippers',
    'LAL': 'Los Angeles Lakers',
    'MEM': 'Memphis Grizzlies',
    'MIA': 'Miami Heat',
    'MIL': 'Milwaukee Bucks',
    'MIN': 'Minnesota Timberwolves',
    'NOP': 'New Orleans Pelicans',
    'NYK': 'New York Knicks',
    'OKC': 'Oklahoma City Thunder',
    'ORL': 'Orlando Magic',
    'PHI': 'Philadelphia 76ers',
    'PHX': 'Phoenix Suns',
    'POR': 'Portland Trail Blazers',
    'SAC': 'Sacramento Kings',
    'SAS': 'San Antonio Spurs',
    'TOR': 'Toronto Raptors',
    'UTA': 'Utah Jazz',
    'WAS': 'Washington Wizards'
};
function getTeamTricode(teamId) {
    return TEAM_ID_TO_TRICODE[teamId] || 'UNK';
}
function getTeamName(tricode) {
    return TEAM_NAMES[tricode] || 'Unknown';
}
async function getHistoricalGames(date) {
    try {
        console.log(`Fetching historical games for ${date}`);
        // Try Python API first (nba-tracker-api) since it has reliable access via nba_api library
        try {
            console.log(`Attempting to fetch from Python API at ${PYTHON_API}`);
            const pythonResponse = await axios_1.default.get(`${PYTHON_API}/schedule/date/${date}`, {
                timeout: REQUEST_TIMEOUT,
                validateStatus: (status) => status < 500 // Accept any successful response or 4xx
            });
            if (pythonResponse.data && pythonResponse.data.games && Array.isArray(pythonResponse.data.games)) {
                const games = pythonResponse.data.games;
                if (games.length > 0) {
                    console.log(`Successfully fetched ${games.length} games from Python API`);
                    // Map Python API response to our format
                    return games.map((game) => {
                        const homeTeamId = parseInt(game.homeTeam?.teamId || '0');
                        const awayTeamId = parseInt(game.awayTeam?.teamId || '0');
                        return {
                            gameId: game.gameId,
                            gameDate: game.gameDate || date,
                            gameStatus: parseInt(game.status || '3'),
                            gameStatusText: game.statusText || 'Final',
                            home_Team: {
                                teamName: game.homeTeam?.name || getTeamName(game.homeTeam?.tricode || 'UNK'),
                                teamId: homeTeamId,
                                teamTricode: game.homeTeam?.tricode || 'UNK',
                                wins: parseInt(game.homeTeam?.wins || '0'),
                                losses: parseInt(game.homeTeam?.losses || '0'),
                                score: parseInt(game.homeTeam?.score || '0')
                            },
                            away_Team: {
                                teamName: game.awayTeam?.name || getTeamName(game.awayTeam?.tricode || 'UNK'),
                                teamId: awayTeamId,
                                teamTricode: game.awayTeam?.tricode || 'UNK',
                                wins: parseInt(game.awayTeam?.wins || '0'),
                                losses: parseInt(game.awayTeam?.losses || '0'),
                                score: parseInt(game.awayTeam?.score || '0')
                            }
                        };
                    });
                }
            }
        }
        catch (pythonError) {
            console.log('Python API not available, trying stats.nba.com directly');
        }
        // Fallback: Try stats.nba.com direct
        console.log(`Attempting to fetch from stats.nba.com`);
        await enforceRateLimit();
        const response = await axios_1.default.get(STATS_NBA_API, {
            params: {
                GameDate: date,
                LeagueID: '00'
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://nba.com',
                'Referer': 'https://nba.com/',
                'Connection': 'keep-alive'
            },
            timeout: REQUEST_TIMEOUT
        });
        const resultSets = response.data.resultSets || [];
        const gameHeader = resultSets.find((rs) => rs.name === 'GameHeader');
        if (!gameHeader || !gameHeader.rowSet || gameHeader.rowSet.length === 0) {
            console.log(`No games found for ${date}`);
            return [];
        }
        const headers = gameHeader.headers;
        const games = gameHeader.rowSet || [];
        const processedGames = games.map((game) => {
            const gameObj = {};
            headers.forEach((header, idx) => {
                gameObj[header] = game[idx];
            });
            // Map stats.nba.com response to our format
            const gameStatus = parseInt(gameObj.GAME_STATUS || '0');
            const gameStatusText = getGameStatusText(gameStatus);
            const homeTeamId = gameObj.HOME_TEAM_ID;
            const awayTeamId = gameObj.VISITOR_TEAM_ID;
            const homeTricode = getTeamTricode(homeTeamId);
            const awayTricode = getTeamTricode(awayTeamId);
            return {
                gameId: gameObj.GAME_ID,
                gameDate: gameObj.GAME_DATE,
                gameStatus: gameStatus,
                gameStatusText: gameStatusText,
                home_Team: {
                    teamName: getTeamName(homeTricode),
                    teamId: homeTeamId,
                    teamTricode: homeTricode,
                    wins: parseInt(gameObj.HOME_TEAM_WINS || '0'),
                    losses: parseInt(gameObj.HOME_TEAM_LOSSES || '0'),
                    score: parseInt(gameObj.PTS_home || '0')
                },
                away_Team: {
                    teamName: getTeamName(awayTricode),
                    teamId: awayTeamId,
                    teamTricode: awayTricode,
                    wins: parseInt(gameObj.VISITOR_TEAM_WINS || '0'),
                    losses: parseInt(gameObj.VISITOR_TEAM_LOSSES || '0'),
                    score: parseInt(gameObj.PTS_away || '0')
                }
            };
        });
        console.log(`Successfully fetched ${processedGames.length} games for ${date}`);
        return processedGames;
    }
    catch (error) {
        console.error(`Error fetching historical games for ${date}:`, error.message);
        throw error;
    }
}
async function getHistoricalBoxScore(gameId) {
    try {
        console.log(`Fetching box score for game ${gameId} from stats.nba.com`);
        // Enforce rate limiting
        await enforceRateLimit();
        const response = await axios_1.default.get('https://stats.nba.com/stats/boxscoresummaryv2', {
            params: {
                GameID: gameId
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://nba.com',
                'Referer': 'https://nba.com/'
            },
            timeout: REQUEST_TIMEOUT
        });
        return response.data;
    }
    catch (error) {
        console.error(`Error fetching box score for game ${gameId}:`, error.message);
        throw error;
    }
}
function getGameStatusText(status) {
    const statusMap = {
        1: 'Not Started',
        2: 'In Progress',
        3: 'Final',
        4: 'Final/OT',
        5: 'Postponed',
        6: 'Cancelled',
        7: 'Suspended'
    };
    return statusMap[status] || 'Unknown';
}
exports.default = {
    getHistoricalGames,
    getHistoricalBoxScore
};
//# sourceMappingURL=historicalData.js.map