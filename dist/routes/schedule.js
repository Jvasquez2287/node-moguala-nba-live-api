"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dataCache_1 = require("../services/dataCache");
const schedule_1 = require("../services/schedule");
const schedule_2 = require("../schemas/schedule");
const router = express_1.default.Router();
// GET /api/v1/schedule - Get today's schedule
router.get('/schedule', async (req, res) => {
    try {
        let scoreboardData = await dataCache_1.dataCache.getScoreboard();
        // If no data in cache, refresh from NBA API
        if (!scoreboardData || !scoreboardData.scoreboard?.games || scoreboardData.scoreboard.games.length === 0) {
            scoreboardData = await dataCache_1.dataCache.refreshScoreboard();
        }
        const scoreboard = scoreboardData?.scoreboard;
        if (!scoreboard || !scoreboard.games || scoreboard.games.length === 0) {
            return res.json({
                date: new Date().toISOString().split('T')[0],
                games: [],
                message: 'No games scheduled for today'
            });
        }
        res.json(scoreboard);
    }
    catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});
// GET /api/v1/schedule/date/:date - Get schedule for a specific date
router.get('/schedule/date/:date', async (req, res) => {
    try {
        const dateParam = req.params.date; // Format: YYYY-MM-DD
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateParam)) {
            return res.status(400).json({
                error: 'Invalid date format. Use YYYY-MM-DD',
                example: '2026-01-25'
            });
        }
        // Get today's date
        const todayDate = new Date().toISOString().split('T')[0];
        const isHistorical = dateParam < todayDate;
        const isFuture = dateParam > todayDate;
        const isToday = dateParam === todayDate;
        // For today's games, use the live NBA API via cache
        if (isToday) {
            let scoreboardData = await dataCache_1.dataCache.getScoreboard();
            if (!scoreboardData || !scoreboardData.scoreboard?.games || scoreboardData.scoreboard.games.length === 0) {
                scoreboardData = await dataCache_1.dataCache.refreshScoreboard();
            }
            const formatData = scoreboardData?.scoreboard?.games.map((game) => {
                const homeTeamId = game.homeTeam.teamId;
                const awayTeamId = game.awayTeam.teamId;
                const homePoints = typeof game.homeTeam.score === 'number' ? game.homeTeam.score : 0;
                const awayPoints = typeof game.awayTeam.score === 'number' ? game.awayTeam.score : 0;
                const gameLeaders = {
                    homeLeaders: {},
                    awayLeaders: {}
                };
                const home_Team = {
                    team_id: game.homeTeam.teamId,
                    team_name: game.homeTeam.teamName,
                    team_city: game.homeTeam.teamCity,
                    team_tricode: game.homeTeam.teamTricode,
                    wins: game.homeTeam.wins,
                    losses: game.homeTeam.losses,
                    score: game.homeTeam.score,
                    points: homePoints,
                    teamId: game.homeTeam.teamId, // Alias for compatibility
                    teamName: game.homeTeam.teamName, // Alias for compatibility
                    teamTricode: game.homeTeam.teamTricode, // Alias for compatibility
                    timeoutsRemaining: game.homeTeam.timeoutsRemaining
                };
                const away_Team = {
                    team_id: game.awayTeam.teamId,
                    team_name: game.awayTeam.teamName,
                    team_city: game.awayTeam.teamCity,
                    team_tricode: game.awayTeam.teamTricode,
                    wins: game.awayTeam.wins,
                    losses: game.awayTeam.losses,
                    score: game.awayTeam.score,
                    points: awayPoints,
                    teamId: game.awayTeam.teamId, // Alias for compatibility
                    teamName: game.awayTeam.teamName, // Alias for compatibility
                    teamTricode: game.awayTeam.teamTricode, // Alias for compatibility
                    timeoutsRemaining: game.awayTeam.timeoutsRemaining
                };
                return {
                    game_id: game.gameId,
                    game_date: game.gameDate,
                    game_time_utc: game.gameTimeUTC,
                    matchup: `${away_Team.team_tricode} vs ${home_Team.team_tricode}`,
                    game_status: game.gameStatusText,
                    arena: game.arena,
                    home_team: home_Team,
                    away_team: away_Team,
                    top_scorer: game.topScorer ? {
                        player_id: game.topScorer.playerId,
                        player_name: game.topScorer.playerName,
                        team_id: game.topScorer.teamId,
                        points: game.topScorer.points,
                        rebounds: game.topScorer.rebounds,
                        assists: game.topScorer.assists
                    } : undefined,
                    ...(game.gameLeaders && (game?.gameLeaders?.awayLeaders?.personId !== 0 || game?.gameLeaders?.homeLeaders?.personId !== 0) ? {
                        gameLeaders: {
                            homeLeaders: game.gameLeaders.homeLeaders ? {
                                personId: game.gameLeaders.homeLeaders.personId,
                                name: game.gameLeaders.homeLeaders.name,
                                jerseyNum: game.gameLeaders.homeLeaders.jerseyNum,
                                position: game.gameLeaders.homeLeaders.position,
                                teamTricode: game.gameLeaders.homeLeaders.teamTricode,
                                points: game.gameLeaders.homeLeaders.points,
                                rebounds: game.gameLeaders.homeLeaders.rebounds,
                                assists: game.gameLeaders.homeLeaders.assists
                            } : null,
                            awayLeaders: game.gameLeaders.awayLeaders ? {
                                personId: game.gameLeaders.awayLeaders.personId,
                                name: game.gameLeaders.awayLeaders.name,
                                jerseyNum: game.gameLeaders.awayLeaders.jerseyNum,
                                position: game.gameLeaders.awayLeaders.position,
                                teamTricode: game.gameLeaders.awayLeaders.teamTricode,
                                points: game.gameLeaders.awayLeaders.points,
                                rebounds: game.gameLeaders.awayLeaders.rebounds,
                                assists: game.gameLeaders.awayLeaders.assists
                            } : null
                        }
                    } : { gameLeaders: null }),
                    win_probability: game.winProbability || undefined
                };
            });
            const gameDate = scoreboardData?.scoreboard?.gameDate;
            const jsScoreboardData = {
                scoreboard: {
                    gameDate: gameDate || new Date().toISOString().split('T')[0],
                    games: formatData
                },
            };
            const scoreboard = jsScoreboardData?.scoreboard;
            if (!scoreboard || !scoreboard.games || scoreboard.games.length === 0) {
                return res.json({
                    date: dateParam,
                    games: [],
                    total: 0,
                    message: 'No games scheduled for today'
                });
            }
            return res.json(scoreboard);
        }
        // For historical or future dates, try to get from Python API (nba-tracker-api)
        if (isHistorical || isFuture) {
            try {
                const { date } = req.params;
                // Validate date format (YYYY-MM-DD)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(date)) {
                    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
                }
                const gamesData = await (0, schedule_1.getGamesForDate)(date);
                if (!gamesData) {
                    return res.status(404).json({ error: `No games found for date ${date}` });
                }
                // Validate response
                const { error } = schedule_2.gamesResponseSchema.validate(gamesData);
                if (error) {
                    console.log('Schedule validation error:', error);
                    return res.status(500).json({ error: 'Invalid schedule data' });
                }
                return res.json(gamesData);
            }
            catch (error) {
                console.log('Error fetching games for date:', error);
                return res.status(500).json({ error: 'Failed to fetch games' });
            }
        }
        // No data available
        return res.json({
            date: dateParam,
            games: [],
            total: 0,
            cacheStatus: 'no_games_for_date',
            cacheDate: todayDate,
            note: isHistorical
                ? 'Historical game data not available from live API. Attempted to fetch from nba-tracker-api but service may be unavailable.'
                : 'Future game data not yet available. Games are added to the API as they approach.',
            suggestion: `Use /api/v1/schedule to get today's games (${todayDate})`
        });
    }
    catch (error) {
        console.error('Error fetching schedule by date:', error);
        res.status(500).json({
            error: 'Failed to fetch schedule by date',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.default = router;
//# sourceMappingURL=schedule.js.map