import express from 'express';
 
import { getPlayer, searchPlayers, getLeagueRoster, getSeasonLeaders } 
from '../services/players';


const router = express.Router();

// Get player details
router.get('/player/:playerId', async (req, res) => {
  try {
    const playerId = req.params.playerId;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const player = await getPlayer(playerId);
    res.json(player);
  } catch (error) {
   console.log(`Error fetching player ${req.params.playerId}:`, error);
    res.status(500).json({ error: 'Failed to fetch player details' });
  }
});

// Search players
router.get('/players/search/:searchTerm', async (req, res) => {
  try {
    const searchTerm = req.params.searchTerm;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const players = await searchPlayers(searchTerm.trim());
    res.json(players);
  } catch (error) {
   console.log('Error searching players:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
});

// Get season leaders
router.get('/players/season-leaders', async (req, res) => {
  try {
    const { season } = req.query;

    // Validate season format if provided
    let seasonParam: string = '2024-25'; // Default season
    if (season && typeof season === 'string') {
      const seasonRegex = /^\d{4}-\d{2}$/;
      if (!seasonRegex.test(season)) {
        return res.status(400).json({ error: 'Invalid season format. Use YYYY-YY' });
      }
      seasonParam = season;
    }

    const seasonLeaders = await getSeasonLeaders(seasonParam);
    res.json(seasonLeaders);
  } catch (error) {
   console.log('Error fetching season leaders:', error);
    res.status(500).json({ error: 'Failed to fetch season leaders' });
  }
});

// Get top players by stat
router.get('/players/top-by-stat', async (req, res) => {
  try {
    // TODO: Implement getTopPlayersByStat function
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
   console.log('Error fetching top players by stat:', error);
    res.status(500).json({ error: 'Failed to fetch top players by stat' });
  }
});

// Get player game log
router.get('/player/:playerId/game-log', async (req, res) => {
  try {
    // TODO: Implement getPlayerGameLog function
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
   console.log('Error fetching player game log:', error);
    res.status(500).json({ error: 'Failed to fetch player game log' });
  }
});

// Get league roster (all active players)
router.get('/players/league-roster', async (req, res) => {
  try {
    const players = await getLeagueRoster();
    res.json(players);
  } catch (error) {
   console.log('Error fetching league roster:', error);
    res.status(500).json({ error: 'Failed to fetch league roster' });
  }
});

export default router;