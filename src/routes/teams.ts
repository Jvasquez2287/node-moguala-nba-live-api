import express from 'express'; 
import { getTeam, getTeamRoster, getAllTeams, getTeamPlayerStats } from '../services/teams';
import { getScoreboard } from '../services/scoreboard';


const router = express.Router();

// Get team statistics
router.get('/teams/stats', async (req, res) => {
  try {
    // TODO: Implement getTeamStats function
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
   console.log('Error fetching team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team stats' });
  }
});

// Get team details
router.get('/teams/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);

    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    const team = await getTeam(teamId);
    return res.json(team);
  } catch (error) {
   console.log(`Error fetching team ${req.params.teamId}:`, error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// Get team game log
router.get('/teams/:teamId/game-log', async (req, res) => {
  try {
    // TODO: Implement getTeamGameLog function
    res.status(501).json({ error: 'Not implemented yet' });
  } catch (error) {
   console.log(`Error fetching game log for team ${req.params.teamId}:`, error);
    res.status(500).json({ error: 'Failed to fetch team game log' });
  }
});

// Get team player statistics
router.get('/teams/:teamId/player-stats', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const season = req.query.season as string;

    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    if (!season) {
      return res.status(400).json({ error: 'Season parameter is required' });
    }

    const playerStats = await getTeamPlayerStats(teamId, season);
   return  res.json(playerStats);
  } catch (error) {
   console.log(`Error fetching player stats for team ${req.params.teamId}:`, error);
    res.status(500).json({ error: 'Failed to fetch team player stats' });
  }
});

// Get all teams
router.get('/teams', async (req, res) => {
  try {
    const teams = await getAllTeams();
    return res.json(teams);
  } catch (error) {
   console.log('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team roster
router.get('/teams/:teamId/roster/:season', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const season = req.params.season;

    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    const roster = await getTeamRoster(teamId, season);
   return  res.json(roster);
  } catch (error) {
   console.log(`Error fetching roster for team ${req.params.teamId}:`, error);
    res.status(500).json({ error: 'Failed to fetch team roster' });
  }
});
 
export default router;