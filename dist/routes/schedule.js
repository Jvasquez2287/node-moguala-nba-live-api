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
            const scoreboard = scoreboardData?.scoreboard;
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
                res.json(gamesData);
            }
            catch (error) {
                console.log('Error fetching games for date:', error);
                res.status(500).json({ error: 'Failed to fetch games' });
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