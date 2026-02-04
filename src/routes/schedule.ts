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

// Python API base URL (nba-tracker-api)
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://nba-v1.m-api.net:8000/api/v1';

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

    const schedule = {
      date: scoreboard.gameDate || new Date().toISOString().split('T')[0],
      games: scoreboard.games.map((game: any) => ({
        gameId: game.gameId,
        startTime: game.gameTimeUTC,
        awayTeam: {
          name: game.awayTeam?.teamName,
          tricode: game.awayTeam?.teamTricode,
          score: game.awayTeam?.score
        },
        homeTeam: {
          name: game.homeTeam?.teamName,
          tricode: game.homeTeam?.teamTricode,
          score: game.homeTeam?.score
        },
        status: game.gameStatus,
        statusText: game.gameStatusText,
        period: game.period,
        gameClock: game.gameClock
      }))
    };

    res.json(schedule);
  } catch (error) {
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
      let scoreboardData = await dataCache.getScoreboard();

      if (!scoreboardData || !scoreboardData.scoreboard?.games || scoreboardData.scoreboard.games.length === 0) {
        scoreboardData = await dataCache.refreshScoreboard();
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

        const gamesData = await getGamesForDate(dateParam);

        if (!gamesData) {
          return res.status(404).json({ error: `No games found for date ${dateParam}` });
        }

        // Validate response
        const { error } = gamesResponseSchema.validate(gamesData);
        if (error) {
          console.log('Schedule validation error:', error);
          return res.status(500).json({ error: 'Invalid schedule data' });
        }

        res.json(gamesData);
      } catch (pythonError) {
        console.log(`Python API unavailable or no data for ${dateParam}:`,
          pythonError instanceof Error ? pythonError.message : pythonError);
        console.log("Remote Endpoint:", `${PYTHON_API_URL}/schedule/date/${dateParam}`);
        // Fall through to return "no data" response
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
    res.status(500).json({
      error: 'Failed to fetch schedule by date',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;