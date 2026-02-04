import express from 'express';
import { dataCache } from '../services/dataCache';
import { TeamDetailsResponse, TeamRoster } from '../schemas/team';
import { Player, Coach } from '../schemas/player';

const router = express.Router();

// GET /api/v1/teams - Get all teams
router.get('/teams', async (req, res) => {
  try {
    let scoreboardData = await dataCache.getScoreboard();
    
    // If no data in cache, refresh from NBA API
    if (!scoreboardData || !scoreboardData.scoreboard?.games || scoreboardData.scoreboard.games.length === 0) {
      scoreboardData = await dataCache.refreshScoreboard();
    }
    
    const scoreboard = scoreboardData?.scoreboard;
    
    if (!scoreboard || !scoreboard.games || scoreboard.games.length === 0) {
      return res.json({
        teams: [],
        total: 0,
        message: 'No games data available'
      });
    }

    // Extract unique teams from games
    const teamsMap = new Map();
    
    scoreboard.games.forEach((game: any) => {
      if (game.homeTeam && !teamsMap.has(game.homeTeam.teamId)) {
        teamsMap.set(game.homeTeam.teamId, {
          teamId: game.homeTeam.teamId,
          name: game.homeTeam.teamName,
          city: game.homeTeam.teamCity,
          tricode: game.homeTeam.teamTricode,
          wins: game.homeTeam.wins || 0,
          losses: game.homeTeam.losses || 0
        });
      }
      
      if (game.awayTeam && !teamsMap.has(game.awayTeam.teamId)) {
        teamsMap.set(game.awayTeam.teamId, {
          teamId: game.awayTeam.teamId,
          name: game.awayTeam.teamName,
          city: game.awayTeam.teamCity,
          tricode: game.awayTeam.teamTricode,
          wins: game.awayTeam.wins || 0,
          losses: game.awayTeam.losses || 0
        });
      }
    });

    res.json({
      teams: Array.from(teamsMap.values()),
      total: teamsMap.size,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/v1/teams/stats - Get team statistics
router.get('/teams/stats', async (req, res) => {
  try {
    const season = req.query.season as string || '2024-25';
    let scoreboardData = await dataCache.getScoreboard();
    
    // If no data in cache, refresh from NBA API
    if (!scoreboardData || !scoreboardData.scoreboard?.games || scoreboardData.scoreboard.games.length === 0) {
      scoreboardData = await dataCache.refreshScoreboard();
    }
    
    const scoreboard = scoreboardData?.scoreboard;
    
    if (!scoreboard || !scoreboard.games || scoreboard.games.length === 0) {
      return res.json({
        season,
        teams: [],
        total: 0,
        message: 'No games data available'
      });
    }

    // Extract team stats from games
    const teamsStatsMap = new Map();
    
    scoreboard.games.forEach((game: any) => {
      // Home team
      if (game.homeTeam) {
        if (!teamsStatsMap.has(game.homeTeam.teamId)) {
          teamsStatsMap.set(game.homeTeam.teamId, {
            teamId: game.homeTeam.teamId,
            name: game.homeTeam.teamName,
            city: game.homeTeam.teamCity,
            tricode: game.homeTeam.teamTricode,
            wins: game.homeTeam.wins || 0,
            losses: game.homeTeam.losses || 0,
            pointsFor: 0,
            pointsAgainst: 0,
            gamesPlayed: 0,
            avgPointsPerGame: 0,
            avgPointsAllowed: 0,
            winPercentage: 0
          });
        }
        
        const teamStats = teamsStatsMap.get(game.homeTeam.teamId);
        teamStats.pointsFor += game.homeTeam.score || 0;
        teamStats.pointsAgainst += game.awayTeam?.score || 0;
        teamStats.gamesPlayed++;
      }
      
      // Away team
      if (game.awayTeam) {
        if (!teamsStatsMap.has(game.awayTeam.teamId)) {
          teamsStatsMap.set(game.awayTeam.teamId, {
            teamId: game.awayTeam.teamId,
            name: game.awayTeam.teamName,
            city: game.awayTeam.teamCity,
            tricode: game.awayTeam.teamTricode,
            wins: game.awayTeam.wins || 0,
            losses: game.awayTeam.losses || 0,
            pointsFor: 0,
            pointsAgainst: 0,
            gamesPlayed: 0,
            avgPointsPerGame: 0,
            avgPointsAllowed: 0,
            winPercentage: 0
          });
        }
        
        const teamStats = teamsStatsMap.get(game.awayTeam.teamId);
        teamStats.pointsFor += game.awayTeam.score || 0;
        teamStats.pointsAgainst += game.homeTeam?.score || 0;
        teamStats.gamesPlayed++;
      }
    });

    // Calculate averages
    const teamsStats = Array.from(teamsStatsMap.values()).map((team: any) => {
      if (team.gamesPlayed > 0) {
        team.avgPointsPerGame = parseFloat((team.pointsFor / team.gamesPlayed).toFixed(1));
        team.avgPointsAllowed = parseFloat((team.pointsAgainst / team.gamesPlayed).toFixed(1));
        team.winPercentage = parseFloat(((team.wins / (team.wins + team.losses)) * 100).toFixed(1));
      }
      return team;
    });

    res.json({
      season,
      teams: teamsStats.sort((a: any, b: any) => b.wins - a.wins),
      total: teamsStats.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team statistics' });
  }
});

// GET /api/v1/teams/:id - Get team details
router.get('/teams/:id', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;
    
    if (!scoreboard || !scoreboard.games) {
      return res.status(404).json({
        error: 'Team not found',
        teamId
      });
    }

    // Find team in games
    let teamData: any = null;
    let teamStats = {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalPoints: 0,
      avgPointsPerGame: 0
    };

    scoreboard.games.forEach((game: any) => {
      if (game.homeTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.homeTeam.teamId,
            name: game.homeTeam.teamName,
            city: game.homeTeam.teamCity,
            tricode: game.homeTeam.teamTricode,
            wins: game.homeTeam.wins || 0,
            losses: game.homeTeam.losses || 0
          };
        }
        teamStats.gamesPlayed++;
        teamStats.totalPoints += game.homeTeam.score || 0;
        if (game.gameStatus === 3) { // Final
          if (game.homeTeam.score > game.awayTeam.score) {
            teamStats.wins++;
          } else {
            teamStats.losses++;
          }
        }
      } else if (game.awayTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.awayTeam.teamId,
            name: game.awayTeam.teamName,
            city: game.awayTeam.teamCity,
            tricode: game.awayTeam.teamTricode,
            wins: game.awayTeam.wins || 0,
            losses: game.awayTeam.losses || 0
          };
        }
        teamStats.gamesPlayed++;
        teamStats.totalPoints += game.awayTeam.score || 0;
        if (game.gameStatus === 3) { // Final
          if (game.awayTeam.score > game.homeTeam.score) {
            teamStats.wins++;
          } else {
            teamStats.losses++;
          }
        }
      }
    });

    if (!teamData) {
      return res.status(404).json({
        error: 'Team not found',
        teamId
      });
    }

    if (teamStats.gamesPlayed > 0) {
      teamStats.avgPointsPerGame = teamStats.totalPoints / teamStats.gamesPlayed;
    }

    res.json({
      team: teamData,
      stats: teamStats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// GET /api/v1/teams/:id/roster - Get team roster
router.get('/:id/roster', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        teamId,
        players: [],
        message: 'No roster data available'
      });
    }

    const rosterPlayers = new Map();
    let teamData: any = null;

    // Extract players from games where this team played
    scoreboard.games.forEach((game: any) => {
      if (game.homeTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.homeTeam.teamId,
            name: game.homeTeam.teamName,
            city: game.homeTeam.teamCity,
            tricode: game.homeTeam.teamTricode
          };
        }
        
        if (game.gameLeaders?.homeLeaders) {
          const leader = game.gameLeaders.homeLeaders;
          if (leader.personId && !rosterPlayers.has(leader.personId)) {
            rosterPlayers.set(leader.personId, {
              playerId: leader.personId,
              name: leader.name || 'Unknown',
              position: leader.position || 'Unknown',
              games: 1,
              points: leader.points || 0,
              rebounds: leader.rebounds || 0,
              assists: leader.assists || 0
            });
          } else if (leader.personId) {
            const player = rosterPlayers.get(leader.personId);
            player.games++;
            player.points += leader.points || 0;
            player.rebounds += leader.rebounds || 0;
            player.assists += leader.assists || 0;
          }
        }
      }

      if (game.awayTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.awayTeam.teamId,
            name: game.awayTeam.teamName,
            city: game.awayTeam.teamCity,
            tricode: game.awayTeam.teamTricode
          };
        }
        
        if (game.gameLeaders?.awayLeaders) {
          const leader = game.gameLeaders.awayLeaders;
          if (leader.personId && !rosterPlayers.has(leader.personId)) {
            rosterPlayers.set(leader.personId, {
              playerId: leader.personId,
              name: leader.name || 'Unknown',
              position: leader.position || 'Unknown',
              games: 1,
              points: leader.points || 0,
              rebounds: leader.rebounds || 0,
              assists: leader.assists || 0
            });
          } else if (leader.personId) {
            const player = rosterPlayers.get(leader.personId);
            player.games++;
            player.points += leader.points || 0;
            player.rebounds += leader.rebounds || 0;
            player.assists += leader.assists || 0;
          }
        }
      }
    });

    const players = Array.from(rosterPlayers.values()).map(p => ({
      ...p,
      avgPoints: parseFloat((p.points / p.games).toFixed(1)),
      avgRebounds: parseFloat((p.rebounds / p.games).toFixed(1)),
      avgAssists: parseFloat((p.assists / p.games).toFixed(1))
    }));

    res.json({
      team: teamData,
      players: players.sort((a, b) => b.avgPoints - a.avgPoints),
      total: players.length
    });
  } catch (error) {
    console.error('Error fetching team roster:', error);
    res.status(500).json({ error: 'Failed to fetch team roster' });
  }
});

// GET /api/v1/teams/:id/game-log - Get team's game log
router.get('/:id/game-log', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 20;
    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        teamId,
        games: [],
        message: 'No game log data available'
      });
    }

    const gameLog: any[] = [];
    let teamData: any = null;

    scoreboard.games.forEach((game: any) => {
      if (game.homeTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.homeTeam.teamId,
            name: game.homeTeam.teamName,
            tricode: game.homeTeam.teamTricode
          };
        }

        gameLog.push({
          gameDate: game.gameDate,
          opponent: game.awayTeam?.teamTricode,
          homeGame: true,
          pointsFor: game.homeTeam?.score || 0,
          pointsAgainst: game.awayTeam?.score || 0,
          result: (game.homeTeam?.score || 0) > (game.awayTeam?.score || 0) ? 'W' : 'L',
          gameStatus: game.gameStatusText || 'Final'
        });
      }

      if (game.awayTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.awayTeam.teamId,
            name: game.awayTeam.teamName,
            tricode: game.awayTeam.teamTricode
          };
        }

        gameLog.push({
          gameDate: game.gameDate,
          opponent: game.homeTeam?.teamTricode,
          homeGame: false,
          pointsFor: game.awayTeam?.score || 0,
          pointsAgainst: game.homeTeam?.score || 0,
          result: (game.awayTeam?.score || 0) > (game.homeTeam?.score || 0) ? 'W' : 'L',
          gameStatus: game.gameStatusText || 'Final'
        });
      }
    });

    // Sort by date descending
    gameLog.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());

    res.json({
      team: teamData,
      games: gameLog.slice(0, limit),
      total: gameLog.length
    });
  } catch (error) {
    console.error('Error fetching team game log:', error);
    res.status(500).json({ error: 'Failed to fetch team game log' });
  }
});

// GET /api/v1/teams/:id/player-stats - Get player statistics for team
router.get('/:id/player-stats', async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const stat = (req.query.stat as string || 'PTS').toUpperCase();
    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        teamId,
        stat,
        players: [],
        message: 'No player stats available'
      });
    }

    const playerStatsMap = new Map();
    let teamData: any = null;

    // Extract player stats for this team
    scoreboard.games.forEach((game: any) => {
      if (game.homeTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.homeTeam.teamId,
            name: game.homeTeam.teamName,
            tricode: game.homeTeam.teamTricode
          };
        }

        if (game.gameLeaders?.homeLeaders) {
          const leader = game.gameLeaders.homeLeaders;
          if (leader.personId) {
            if (!playerStatsMap.has(leader.personId)) {
              playerStatsMap.set(leader.personId, {
                playerId: leader.personId,
                name: leader.name || 'Unknown',
                games: 0,
                pts: 0,
                reb: 0,
                ast: 0,
                stl: 0,
                blk: 0
              });
            }
            const stats = playerStatsMap.get(leader.personId);
            stats.games++;
            stats.pts += leader.points || 0;
            stats.reb += leader.rebounds || 0;
            stats.ast += leader.assists || 0;
            stats.stl += leader.steals || 0;
            stats.blk += leader.blocks || 0;
          }
        }
      }

      if (game.awayTeam?.teamId === teamId) {
        if (!teamData) {
          teamData = {
            teamId: game.awayTeam.teamId,
            name: game.awayTeam.teamName,
            tricode: game.awayTeam.teamTricode
          };
        }

        if (game.gameLeaders?.awayLeaders) {
          const leader = game.gameLeaders.awayLeaders;
          if (leader.personId) {
            if (!playerStatsMap.has(leader.personId)) {
              playerStatsMap.set(leader.personId, {
                playerId: leader.personId,
                name: leader.name || 'Unknown',
                games: 0,
                pts: 0,
                reb: 0,
                ast: 0,
                stl: 0,
                blk: 0
              });
            }
            const stats = playerStatsMap.get(leader.personId);
            stats.games++;
            stats.pts += leader.points || 0;
            stats.reb += leader.rebounds || 0;
            stats.ast += leader.assists || 0;
            stats.stl += leader.steals || 0;
            stats.blk += leader.blocks || 0;
          }
        }
      }
    });

    // Calculate averages and sort by requested stat
    const statMap: Record<string, string> = {
      'PTS': 'pts',
      'REB': 'reb',
      'AST': 'ast',
      'STL': 'stl',
      'BLK': 'blk'
    };

    const statKey = statMap[stat] || 'pts';
    const players = Array.from(playerStatsMap.values())
      .map(p => ({
        ...p,
        pts: parseFloat((p.pts / Math.max(p.games, 1)).toFixed(1)),
        reb: parseFloat((p.reb / Math.max(p.games, 1)).toFixed(1)),
        ast: parseFloat((p.ast / Math.max(p.games, 1)).toFixed(1)),
        stl: parseFloat((p.stl / Math.max(p.games, 1)).toFixed(1)),
        blk: parseFloat((p.blk / Math.max(p.games, 1)).toFixed(1))
      }))
      .sort((a, b) => b[statKey as keyof typeof a] - a[statKey as keyof typeof b]);

    res.json({
      team: teamData,
      stat,
      players,
      total: players.length
    });
  } catch (error) {
    console.error('Error fetching team player stats:', error);
    res.status(500).json({ error: 'Failed to fetch team player stats' });
  }
});

export default router;