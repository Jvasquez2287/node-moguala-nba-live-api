import express from 'express';
import { dataCache } from '../services/dataCache';
import { SearchResults, PlayerResult, TeamResult } from '../schemas/search';

const router = express.Router();

// GET /api/v1/search - Search for players, teams, etc
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string || '').toLowerCase();
    const type = (req.query.type as string || 'all').toLowerCase();

    if (!query || query.length < 2) {
      return res.json({
        query,
        results: [],
        message: 'Search query must be at least 2 characters'
      });
    }

    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        query,
        results: []
      });
    }

    const results: any = {
      players: [],
      teams: [],
      games: []
    };

    // Search players
    if (type === 'all' || type === 'player') {
      const playersSet = new Set();
      scoreboard.games.forEach((game: any) => {
        [game.gameLeaders?.homeLeaders, game.gameLeaders?.awayLeaders].forEach((leader: any) => {
          if (leader?.name && leader.name.toLowerCase().includes(query) && !playersSet.has(leader.personId)) {
            playersSet.add(leader.personId);
            results.players.push({
              playerId: leader.personId,
              name: leader.name,
              team: leader.team || (game.homeTeam?.teamTricode === leader.teamTricode ? game.homeTeam?.teamTricode : game.awayTeam?.teamTricode),
              position: leader.position || 'Unknown'
            });
          }
        });
      });
    }

    // Search teams
    if (type === 'all' || type === 'team') {
      const teamsSet = new Set();
      scoreboard.games.forEach((game: any) => {
        [game.homeTeam, game.awayTeam].forEach((team: any) => {
          if (team && !teamsSet.has(team.teamId) &&
              (team.teamName.toLowerCase().includes(query) || 
               team.teamCity.toLowerCase().includes(query) ||
               team.teamTricode.toLowerCase().includes(query))) {
            teamsSet.add(team.teamId);
            results.teams.push({
              teamId: team.teamId,
              name: team.teamName,
              city: team.teamCity,
              tricode: team.teamTricode,
              wins: team.wins || 0,
              losses: team.losses || 0
            });
          }
        });
      });
    }

    // Search games
    if (type === 'all' || type === 'game') {
      scoreboard.games.forEach((game: any) => {
        const matchesHome = game.homeTeam?.teamName.toLowerCase().includes(query) || 
                           game.homeTeam?.teamCity.toLowerCase().includes(query);
        const matchesAway = game.awayTeam?.teamName.toLowerCase().includes(query) ||
                           game.awayTeam?.teamCity.toLowerCase().includes(query);
        
        if (matchesHome || matchesAway) {
          results.games.push({
            gameId: game.gameId,
            awayTeam: game.awayTeam?.teamName,
            homeTeam: game.homeTeam?.teamName,
            status: game.gameStatus,
            statusText: game.gameStatusText
          });
        }
      });
    }

    res.json({
      query,
      type,
      results,
      total: results.players.length + results.teams.length + results.games.length
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

export default router;