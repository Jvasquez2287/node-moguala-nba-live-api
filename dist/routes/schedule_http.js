"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const schedule_1 = require("../services/schedule");
const router = express_1.default.Router();
// GET /api/v1/schedule-v1 - Get full NBA schedule
router.get('/schedule-v1', async (req, res) => {
    try {
        console.log('[Route] Schedule request received');
        const schedule = await schedule_1.scheduleService.getSchedules();
        if (!schedule) {
            return res.status(503).json({ error: 'Schedule data not available' });
        }
        return res.json(schedule);
    }
    catch (error) {
        console.error('[Route] Error fetching schedule:', error);
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});
// GET /api/v1/schedule-v1/today - Get today's games
router.get('/schedule-v1/today', async (req, res) => {
    try {
        console.log('[Route] Today\'s games request received');
        const todaysGames = await schedule_1.scheduleService.getTodaysSchedule();
        return res.json(todaysGames);
    }
    catch (error) {
        console.error('[Route] Error fetching today\'s games:', error);
        return res.status(500).json({ error: 'Failed to fetch today\'s games' });
    }
});
// GET /api/v1/schedule-v1/date/:date - Get schedule for a specific date
router.get('/schedule-v1/date/:date', async (req, res) => {
    try {
        const dateParam = req.params.date;
        console.log(`[Route] Schedule request for date: ${dateParam}`);
        const scheduleByDate = await schedule_1.scheduleService.getScheduleByDate(dateParam);
        return res.json(scheduleByDate);
    }
    catch (error) {
        console.error('[Route] Error fetching schedule by date:', error);
        return res.status(500).json({ error: 'Failed to fetch schedule by date' });
    }
});
// POST /api/v1/schedule-v1/refresh - Manually refresh schedule
router.post('/schedule-v1/refresh', async (req, res) => {
    try {
        console.log('[Route] Schedule refresh requested');
        const schedule = await schedule_1.scheduleService.refreshSchedule();
        return res.json({
            success: true,
            message: 'Schedule refreshed successfully',
            games: schedule.games.length,
            season: schedule.season,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('[Route] Error refreshing schedule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh schedule',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/v1/schedule-v1/games - Get all games with optional filters
router.get('/schedule-v1/games', async (req, res) => {
    try {
        console.log('[Route] Schedule games request received');
        const schedule = await schedule_1.scheduleService.getSchedules();
        if (!schedule || schedule.length === 0) {
            return res.status(503).json({ error: 'Schedule data not available' });
        }
        const { season, status, team } = req.query;
        let games = schedule;
        // Filter by season if provided
        if (season) {
            games = games.filter((game) => game.seasonStageId === parseInt(season));
        }
        // Filter by game status if provided (1=Scheduled, 2=Live, 3=Final)
        if (status) {
            games = games.filter((game) => game.gameStatus === parseInt(status));
        }
        // Filter by team if provided
        if (team) {
            const teamFilter = team.toUpperCase();
            games = games.filter((game) => game.homeTeam?.teamTricode === teamFilter ||
                game.awayTeam?.teamTricode === teamFilter);
        }
        return res.json({
            gameCount: games.length,
            games
        });
    }
    catch (error) {
        console.error('[Route] Error fetching schedule games:', error);
        res.status(500).json({ error: 'Failed to fetch schedule games' });
    }
});
// GET /api/v1/schedule-v1/game/:gameId - Get specific game details from schedule
router.get('/schedule-v1/game/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        console.log(`[Route] Schedule game request for ${gameId}`);
        const schedule = await schedule_1.scheduleService.getSchedules();
        if (!schedule || schedule.length === 0) {
            return res.status(503).json({ error: 'Schedule data not available' });
        }
        const games = schedule.find((g) => g.games && g.games.some((game) => game.gameId === gameId));
        const game = games?.games?.find((game) => game.gameId === gameId);
        const gameDate = games ? games.gameDate : null;
        if (!game) {
            return res.json({
                error: 'Game not found',
                gameId
            });
        }
        return res.json({
            gameDate: gameDate,
            game: game
        });
    }
    catch (error) {
        console.error('[Route] Error fetching schedule game:', error);
        res.status(500).json({ error: 'Failed to fetch schedule game' });
    }
});
exports.default = router;
//# sourceMappingURL=schedule_http.js.map