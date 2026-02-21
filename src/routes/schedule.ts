import express from 'express';
import { dataCache } from '../services/dataCache';
import axios from 'axios';
import {
  GamesResponse,
  GameSummary,
  TeamSummary,
  TopScorer,
  GameLeaders,
  GameLeader
} from '../schemas/schedule';

import { getGamesForDate } from '../services/schedule';
import { gamesResponseSchema } from '../schemas/schedule';

const router = express.Router();

// GET /api/v1/schedule - Get today's schedule
router.get('/schedule', async (req, res) => {
  try {
    let scoreboardData = await dataCache.getScoreboard();

    // If no data in cache, refresh from NBA API
    if (!scoreboardData || !scoreboardData.scoreboard?.games || scoreboardData.scoreboard.games.length === 0) {
      scoreboardData = await dataCache.refreshScoreboard();
    }

    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games || scoreboard.games.length === 0) {
      return res.json({
        date: new Date().toISOString().split('T')[0],
        games: [],
        message: 'No games scheduled for today'
      });
    }

    return res.json(scoreboard);

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.json({ error: 'Failed to fetch schedule' });
  }
});

// GET /api/v1/schedule/date/:date - Get schedule for a specific date
router.get('/schedule/date/:date', async (req, res) => {
  try {
    const dateParam = req.params.date; // Format: YYYY-MM-DD
    
 
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return res.json({
        error: 'Invalid date format. Use YYYY-MM-DD',
        example: '2026-01-25'
      });
    }

        
   
    // Get today's date
    const todayDate = new Date().toISOString().split('T')[0];
    const isHistorical = dateParam < todayDate;
    const isFuture = dateParam > todayDate;
    const isToday = dateParam === todayDate;
 
 
    // For historical or future dates, try to get from Python API (nba-tracker-api)
    if (isHistorical || isFuture) {
      try {
        const { date } = req.params;

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          return res.json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
 
        const gamesData = await getGamesForDate(date);

        console.log(`Fetched games for date ${date} from nba-tracker-api:`);

        if (!gamesData) {
          return res.json({ error: `No games found for date ${date}` });
        }

       
        // Validate response
        const { error } = gamesResponseSchema.validate(gamesData);
        if (error) {
          console.log('Schedule validation error:', error);
          return res.json({ error: 'Invalid schedule data' });
        }

        return res.json(gamesData);
      } catch (error) {
        console.log('Error fetching games for date:', error);
        return res.json({ error: 'Failed to fetch games' });
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

  } catch (error) {
    console.error('Error fetching schedule by date:', error);
    res.json({
      error: 'Failed to fetch schedule by date',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;