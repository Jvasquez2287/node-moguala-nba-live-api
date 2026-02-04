import express from 'express';
import * as winston from 'winston';
import { dataCache } from '../services/dataCache';
import { scoreboardWebsocketManager } from '../services/websocketsManager';
import { getKeyMomentsForGame } from '../services/keyMoments';
import { getWinProbability } from '../services/winProbability';
import { generateBatchedInsights, generateLeadChangeExplanation } from '../services/batchedInsights';
import { getScoreboard, getPlayByPlay, getBoxScore } from '../services/scoreboard';
import { getTeamRoster } from '../services/teams';
import { scoreboardResponseSchema, KeyMomentsResponse, WinProbabilityResponse } from '../schemas/scoreboard';


const router = express.Router();

// WebSocket endpoint for live score updates will be handled at the app level

// Get current scoreboard
router.get('/scoreboard', async (req, res) => {
  try {
    const scoreboardData = await  dataCache.getScoreboard();

    if (!scoreboardData) {
      return res.json({
        scoreboard: {
          gameDate: new Date().toISOString().split('T')[0],
          games: []
        }
      });
    }

    // Validate response
    const { error } = scoreboardResponseSchema.validate(scoreboardData);
    if (error) {
     console.log('Scoreboard validation error:', error);
      return res.status(500).json({ error: 'Invalid scoreboard data' });
    }

    return res.json(scoreboardData);
  } catch (error) {
   console.log('Error fetching scoreboard:', error);
    res.status(500).json({ error: 'Failed to fetch scoreboard' });
  }
});


// Get play-by-play for a game
router.get('/scoreboard/game/:gameId/play-by-play', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!/^\d{10}$/.test(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    const playbyplayData = await getPlayByPlay(gameId);

    if (!playbyplayData) {
      return res.status(404).json({ error: 'Play-by-play data not found' });
    }

    res.json(playbyplayData);
  } catch (error) {
   console.log('Error fetching play-by-play:', error);
    res.status(500).json({ error: 'Failed to fetch play-by-play data' });
  }
});

// Get box score for a game
router.get('/scoreboard/game/:gameId/boxscore', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!/^\d{10}$/.test(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    const boxScoreData = await getBoxScore(gameId);

    if (!boxScoreData) {
      return res.status(404).json({ error: 'Box score not found' });
    }

    res.json(boxScoreData);
  } catch (error) {
   console.log('Error fetching box score:', error);
    res.status(500).json({ error: 'Failed to fetch box score' });
  }
});

// Get key moments for a game
router.get('/scoreboard/game/:gameId/key-moments', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!/^\d{10}$/.test(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    const keyMoments = await getKeyMomentsForGame(gameId);

    const response: KeyMomentsResponse = {
      game_id: gameId,
      moments: keyMoments
    };

    res.json(response);
  } catch (error) {
   console.log('Error fetching key moments:', error);
    res.status(500).json({ error: 'Failed to fetch key moments' });
  }
});

// Get win probability for a game
router.get('/scoreboard/game/:gameId/win-probability', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!/^\d{10}$/.test(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID format' });
    }

    const winProbability = await getWinProbability(gameId);

    const response: WinProbabilityResponse = {
      game_id: gameId,
      win_probability: winProbability || undefined
    };

    res.json(response);
  } catch (error) {
   console.log('Error fetching win probability:', error);
    res.status(500).json({ error: 'Failed to fetch win probability' });
  }
});



// Get batched insights
router.get('/scoreboard/insights', async (req, res) => {
  try {
    // TODO: Implement getBatchedInsights function
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
   console.log('Error fetching batched insights:', error);
    res.status(500).json({ error: 'Failed to fetch batched insights' });
  }
});

// Get lead change explanation
router.get('/scoreboard/game/:gameId/lead-change', async (req, res) => {
  try {
    // TODO: Implement getLeadChangeExplanation function
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
   console.log('Error fetching lead change explanation:', error);
    res.status(500).json({ error: 'Failed to fetch lead change explanation' });
  }
});

// Generate batched insights
router.post('/insights/batched', async (req, res) => {
  try {
    const { game_ids, insight_types } = req.body;

    if (!Array.isArray(game_ids) || game_ids.length === 0) {
      return res.status(400).json({ error: 'game_ids must be a non-empty array' });
    }

    const insights = await generateBatchedInsights(game_ids, insight_types);
    res.json(insights);
  } catch (error) {
   console.log('Error generating batched insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Generate lead change explanation
router.post('/insights/lead-change', async (req, res) => {
  try {
    const { game_id, lead_changes } = req.body;

    if (!game_id || !Array.isArray(lead_changes)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    const explanation = await generateLeadChangeExplanation(game_id, lead_changes);
    res.json({ explanation });
  } catch (error) {
   console.log('Error generating lead change explanation:', error);
    res.status(500).json({ error: 'Failed to generate explanation' });
  }
});

export default router;