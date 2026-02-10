import express from 'express';
import { scheduleService } from '../services/schedule';

const router = express.Router();

// GET /api/v1/schedule-v1 - Get full NBA schedule
router.get('/schedule-v1', async (req, res) => {
  try {
    console.log('[Route] Schedule request received');
    const schedule = await scheduleService.getSchedules();

    if (!schedule) {
      return res.status(503).json({ error: 'Schedule data not available' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('[Route] Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});


// GET /api/v1/schedule-v1/today - Get today's games
router.get('/schedule-v1/today', async (req, res) => {
  try {
    console.log('[Route] Today\'s games request received');
    const todaysGames = await scheduleService.getTodaysSchedule();
    res.json(todaysGames);
  } catch (error) {
    console.error('[Route] Error fetching today\'s games:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s games' });
  }
});

// GET /api/v1/schedule-v1/date/:date - Get schedule for a specific date
router.get('/schedule-v1/date/:date', async (req, res) => { 
  try {
    const dateParam = req.params.date;
    console.log(`[Route] Schedule request for date: ${dateParam}`);
    const scheduleByDate = await scheduleService.getScheduleByDate(dateParam);
    res.json(scheduleByDate);
  } catch (error) {
    console.error('[Route] Error fetching schedule by date:', error);
    res.status(500).json({ error: 'Failed to fetch schedule by date' });
  }
});

// POST /api/v1/schedule-v1/refresh - Manually refresh schedule
router.post('/schedule-v1/refresh', async (req, res) => {
  try {
    console.log('[Route] Schedule refresh requested');
    const schedule = await scheduleService.refreshSchedule();

    res.json({
      success: true,
      message: 'Schedule refreshed successfully',
      games: schedule.games.length,
      season: schedule.season,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
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
    const schedule = await scheduleService.getSchedules();

    if (!schedule || schedule.length === 0) {
      return res.status(503).json({ error: 'Schedule data not available' });
    }

    const { season, status, team } = req.query;
    let games = schedule;

    // Filter by season if provided
    if (season) {
      games = games.filter((game: any) => game.seasonStageId === parseInt(season as string));
    }

    // Filter by game status if provided (1=Scheduled, 2=Live, 3=Final)
    if (status) {
      games = games.filter((game: any) => game.gameStatus === parseInt(status as string));
    }

    // Filter by team if provided
    if (team) {
      const teamFilter = (team as string).toUpperCase();
      games = games.filter((game: any) =>
        game.homeTeam?.teamTricode === teamFilter ||
        game.awayTeam?.teamTricode === teamFilter
      );
    }

    res.json({
      gameCount: games.length,
      games
    });
  } catch (error) {
    console.error('[Route] Error fetching schedule games:', error);
    res.status(500).json({ error: 'Failed to fetch schedule games' });
  }
});

// GET /api/v1/schedule-v1/game/:gameId - Get specific game details from schedule
router.get('/schedule-v1/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log(`[Route] Schedule game request for ${gameId}`);

    const schedule = await scheduleService.getSchedules();

    if (!schedule || schedule.length === 0) {
      return res.status(503).json({ error: 'Schedule data not available' });
    }

    const games = schedule.find((g: any) => g.games && g.games.some((game: any) => game.gameId === gameId));
    const game = games?.games?.find((game: any) => game.gameId === gameId);
    const gameDate = games ? games.gameDate : null;
    if (!game) {
      return res.json({
        error: 'Game not found',
        gameId
      });
    }

    res.json({
      gameDate: gameDate, 
      game:game
    });
  } catch (error) {
    console.error('[Route] Error fetching schedule game:', error);
    res.status(500).json({ error: 'Failed to fetch schedule game' });
  }
});

export default router;
