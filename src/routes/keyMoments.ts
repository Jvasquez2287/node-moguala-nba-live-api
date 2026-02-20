import express from 'express';
import { keyMomentsService } from '../services/keyMoments';
import { dataCache } from '../services/dataCache';

const router = express.Router();

/**
 * GET /api/v1/key-moments/:gameId
 * 
 * Get all detected key moments for a specific game
 * 
 * Returns moments like:
 * - Game-tying shots
 * - Lead changes
 * - Scoring runs (6+ points)
 * - Clutch plays (4th quarter, <2 min, close)
 * - Big shots (3-pointers with impact)
 * 
 * Each moment includes type, play data, timestamp, and AI-generated context
 */
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        error: 'gameId is required'
      });
    }

    console.log(`[KeyMoments API] Fetching moments for game ${gameId}`);

    // Get moments with AI context
    const moments = await keyMomentsService.getKeyMomentsForGame(gameId);

    // Get game info from scoreboard
    const scoreboardData = await dataCache.getScoreboard();
    let gameInfo = null;

    if (scoreboardData?.scoreboard?.games) {
      const game = scoreboardData.scoreboard.games.find((g: any) => g.gameId === gameId);
      if (game) {
        gameInfo = {
          gameId: game.gameId,
          homeTeam: {
            name: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`.trim(),
            tricode: game.homeTeam.teamTricode,
            score: game.homeTeam.score
          },
          awayTeam: {
            name: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`.trim(),
            tricode: game.awayTeam.teamTricode,
            score: game.awayTeam.score
          },
          period: game.period,
          gameClock: game.gameClock,
          gameStatus: game.gameStatus,
          gameStatusText: game.gameStatusText
        };
      }
    }

    return res.json({
      success: true,
      gameId,
      gameInfo,
      moments: moments || [],
      count: moments?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[KeyMoments API] Error fetching moments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch key moments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/key-moments
 * 
 * Get all key moments across all live games
 * 
 * Useful for a "highlights reel" or "top moments" feature
 */
router.get('/', async (req, res) => {
  try {
    console.log('[KeyMoments API] Fetching all moments');

    const scoreboardData = await dataCache.getScoreboard();
    if (!scoreboardData?.scoreboard?.games) {
      return res.json({
        success: true,
        moments: [],
        gameCount: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Get moments for all live games
    const allMoments: any[] = [];
    const liveGames = scoreboardData.scoreboard.games.filter(
      (game: any) => game.gameStatus === 2 // Live games
    );

    for (const game of liveGames) {
      try {
        const moments = await keyMomentsService.getKeyMomentsForGame(game.gameId);
        if (moments && moments.length > 0) {
          allMoments.push({
            gameId: game.gameId,
            homeTeam: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`.trim(),
            awayTeam: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`.trim(),
            moments: moments
          });
        }
      } catch (error) {
        console.warn(`[KeyMoments API] Error fetching moments for game ${game.gameId}:`, error);
      }
    }

    return res.json({
      success: true,
      moments: allMoments,
      gameCount: liveGames.length,
      momentCount: allMoments.reduce((sum, game) => sum + game.moments.length, 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[KeyMoments API] Error fetching all moments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch key moments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
