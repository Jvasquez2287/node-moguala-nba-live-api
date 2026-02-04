import express from 'express';
import { dataCache } from '../services/dataCache';
import { LeagueLeadersResponse, LeagueLeader } from '../schemas/league';

const router = express.Router();

// GET /api/v1/league - Get league information
router.get('/league', async (req, res) => {
  try {
    res.json({
      name: 'NBA',
      season: new Date().getFullYear(),
      seasonType: 'Regular Season',
      conferences: [
        {
          id: 1,
          name: 'Eastern Conference',
          divisions: ['Atlantic', 'Central', 'Southeast']
        },
        {
          id: 2,
          name: 'Western Conference',
          divisions: ['Northwest', 'Pacific', 'Southwest']
        }
      ],
      totalTeams: 30,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching league info:', error);
    res.status(500).json({ error: 'Failed to fetch league information' });
  }
});

// GET /api/v1/league/leaders - Get league leaders
router.get('/league/leaders', async (req, res) => {
  try {
    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        season: new Date().getFullYear(),
        leaders: {
          scoring: [],
          assists: [],
          rebounds: [],
          steals: [],
          blocks: []
        }
      });
    }

    // Extract player leaders from game data
    const playersStats = new Map();

    scoreboard.games.forEach((game: any) => {
      [game.gameLeaders?.homeLeaders, game.gameLeaders?.awayLeaders].forEach((leader: any) => {
        if (leader?.personId) {
          if (!playersStats.has(leader.personId)) {
            playersStats.set(leader.personId, {
              playerId: leader.personId,
              name: leader.name,
              team: leader.teamTricode,
              points: 0,
              assists: 0,
              rebounds: 0,
              steals: 0,
              blocks: 0,
              gamesPlayed: 0
            });
          }
          
          const stats = playersStats.get(leader.personId);
          stats.points += leader.points || 0;
          stats.assists += leader.assists || 0;
          stats.rebounds += leader.rebounds || 0;
          stats.steals += leader.steals || 0;
          stats.blocks += leader.blocks || 0;
          stats.gamesPlayed++;
        }
      });
    });

    // Calculate per-game averages
    const players = Array.from(playersStats.values()).map((player: any) => ({
      ...player,
      avgPoints: parseFloat((player.points / player.gamesPlayed).toFixed(1)),
      avgAssists: parseFloat((player.assists / player.gamesPlayed).toFixed(1)),
      avgRebounds: parseFloat((player.rebounds / player.gamesPlayed).toFixed(1))
    }));

    // Get leaders for each category
    const scoringLeaders = players.sort((a: any, b: any) => b.avgPoints - a.avgPoints).slice(0, 10);
    const assistsLeaders = players.sort((a: any, b: any) => b.avgAssists - a.avgAssists).slice(0, 10);
    const reboundsLeaders = players.sort((a: any, b: any) => b.avgRebounds - a.avgRebounds).slice(0, 10);
    const stealsLeaders = players.sort((a: any, b: any) => b.steals - a.steals).slice(0, 10);
    const blocksLeaders = players.sort((a: any, b: any) => b.blocks - a.blocks).slice(0, 10);

    res.json({
      season: new Date().getFullYear(),
      leaders: {
        scoring: scoringLeaders,
        assists: assistsLeaders,
        rebounds: reboundsLeaders,
        steals: stealsLeaders,
        blocks: blocksLeaders
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching league leaders:', error);
    res.status(500).json({ error: 'Failed to fetch league leaders' });
  }
});

export default router;