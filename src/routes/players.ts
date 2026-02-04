import express from 'express';
import { dataCache } from '../services/dataCache';
import { PlayerSummary, PlayerGamePerformance } from '../schemas/player';
import { SeasonLeadersResponse } from '../schemas/seasonleaders';

const router = express.Router();

// GET /api/v1/players - Get player list
router.get('/players', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const team = req.query.team as string;

    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        page,
        limit,
        total: 0,
        players: []
      });
    }

    // Extract unique players from games (from game leaders)
    const playersMap = new Map();

    scoreboard.games.forEach((game: any) => {
      // Home team game leaders
      if (game.gameLeaders?.homeLeaders) {
        const leader = game.gameLeaders.homeLeaders;
        if (leader.personId && !playersMap.has(leader.personId)) {
          playersMap.set(leader.personId, {
            playerId: leader.personId,
            name: leader.name || 'Unknown',
            team: game.homeTeam?.teamTricode,
            teamId: game.homeTeam?.teamId,
            points: leader.points || 0,
            rebounds: leader.rebounds || 0,
            assists: leader.assists || 0,
            position: leader.position || 'Unknown'
          });
        }
      }

      // Away team game leaders
      if (game.gameLeaders?.awayLeaders) {
        const leader = game.gameLeaders.awayLeaders;
        if (leader.personId && !playersMap.has(leader.personId)) {
          playersMap.set(leader.personId, {
            playerId: leader.personId,
            name: leader.name || 'Unknown',
            team: game.awayTeam?.teamTricode,
            teamId: game.awayTeam?.teamId,
            points: leader.points || 0,
            rebounds: leader.rebounds || 0,
            assists: leader.assists || 0,
            position: leader.position || 'Unknown'
          });
        }
      }
    });

    let players = Array.from(playersMap.values());

    // Filter by team if specified
    if (team) {
      players = players.filter(p => p.team?.toLowerCase() === team.toLowerCase());
    }

    // Pagination
    const total = players.length;
    const startIdx = (page - 1) * limit;
    const endIdx = startIdx + limit;
    const paginatedPlayers = players.slice(startIdx, endIdx);

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      players: paginatedPlayers
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// GET /api/v1/players/league-roster - Get full league roster
router.get('/players/league-roster', async (req, res) => {
  try {
    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        total: 0,
        players: [],
        teams: {}
      });
    }

    // Extract all players from games
    const playersMap = new Map();
    const teamRosters: { [key: string]: any[] } = {};

    scoreboard.games.forEach((game: any) => {
      // Home team game leaders
      if (game.gameLeaders?.homeLeaders) {
        const leader = game.gameLeaders.homeLeaders;
        const teamTricode = game.homeTeam?.teamTricode;
        if (leader.personId && !playersMap.has(leader.personId)) {
          const playerData = {
            playerId: leader.personId,
            name: leader.name || 'Unknown',
            team: teamTricode,
            teamId: game.homeTeam?.teamId,
            teamName: game.homeTeam?.teamName,
            points: leader.points || 0,
            rebounds: leader.rebounds || 0,
            assists: leader.assists || 0,
            position: leader.position || 'Unknown'
          };
          playersMap.set(leader.personId, playerData);
          
          if (!teamRosters[teamTricode]) {
            teamRosters[teamTricode] = [];
          }
          teamRosters[teamTricode].push(playerData);
        }
      }

      // Away team game leaders
      if (game.gameLeaders?.awayLeaders) {
        const leader = game.gameLeaders.awayLeaders;
        const teamTricode = game.awayTeam?.teamTricode;
        if (leader.personId && !playersMap.has(leader.personId)) {
          const playerData = {
            playerId: leader.personId,
            name: leader.name || 'Unknown',
            team: teamTricode,
            teamId: game.awayTeam?.teamId,
            teamName: game.awayTeam?.teamName,
            points: leader.points || 0,
            rebounds: leader.rebounds || 0,
            assists: leader.assists || 0,
            position: leader.position || 'Unknown'
          };
          playersMap.set(leader.personId, playerData);
          
          if (!teamRosters[teamTricode]) {
            teamRosters[teamTricode] = [];
          }
          teamRosters[teamTricode].push(playerData);
        }
      }
    });

    const players = Array.from(playersMap.values());

    res.json({
      total: players.length,
      players: players.sort((a, b) => b.points - a.points), // Sort by points
      teams: teamRosters,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching league roster:', error);
    res.status(500).json({ error: 'Failed to fetch league roster' });
  }
});

// GET /api/v1/players/season-leaders - Get season leaders by stat category
router.get('/season-leaders', async (req, res) => {
  try {
    const statCategory = (req.query.stat as string || 'PTS').toUpperCase();
    const limit = parseInt(req.query.limit as string) || 5;
    
    const validStats = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'FG', 'FT', '3P'];
    if (!validStats.includes(statCategory)) {
      return res.status(400).json({
        error: 'Invalid stat category',
        validStats,
        provided: statCategory
      });
    }

    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        category: statCategory,
        season: new Date().getFullYear(),
        leaders: [],
        message: 'No games available'
      });
    }

    // Collect player stats from all games
    const playerStatsMap = new Map();

    scoreboard.games.forEach((game: any) => {
      [game.gameLeaders?.homeLeaders, game.gameLeaders?.awayLeaders].forEach((leader: any) => {
        if (!leader || !leader.personId) return;

        if (!playerStatsMap.has(leader.personId)) {
          playerStatsMap.set(leader.personId, {
            playerId: leader.personId,
            name: leader.name || 'Unknown',
            team: leader.teamTricode || (game.homeTeam?.personId === leader.personId ? game.homeTeam?.teamTricode : game.awayTeam?.teamTricode),
            games: 0,
            pts: 0,
            reb: 0,
            ast: 0,
            stl: 0,
            blk: 0,
            fg: 0,
            ft: 0,
            '3p': 0
          });
        }

        const stats = playerStatsMap.get(leader.personId);
        stats.games++;
        stats.pts += leader.points || 0;
        stats.reb += leader.rebounds || 0;
        stats.ast += leader.assists || 0;
        stats.stl += leader.steals || 0;
        stats.blk += leader.blocks || 0;
        stats.fg += leader.fieldGoalsAttempted ? leader.fieldGoalsMade || 0 : 0;
        stats.ft += leader.freeThrowsAttempted ? leader.freeThrowsMade || 0 : 0;
        stats['3p'] += leader.threePointersMade || 0;
      });
    });

    // Calculate averages and sort by stat
    const statMap = {
      'PTS': 'pts',
      'REB': 'reb',
      'AST': 'ast',
      'STL': 'stl',
      'BLK': 'blk',
      'FG': 'fg',
      'FT': 'ft',
      '3P': '3p'
    };

    const statKey = statMap[statCategory as keyof typeof statMap] || 'pts';

    const leaders = Array.from(playerStatsMap.values())
      .map(stat => ({
        ...stat,
        statAverage: parseFloat((stat[statKey as keyof typeof stat] / Math.max(stat.games, 1)).toFixed(1))
      }))
      .sort((a, b) => b.statAverage - a.statAverage)
      .slice(0, limit)
      .map((stat, idx) => ({
        rank: idx + 1,
        playerId: stat.playerId,
        name: stat.name,
        team: stat.team,
        stat: statCategory,
        statValue: stat.statAverage,
        gamesPlayed: stat.games
      }));

    res.json({
      category: statCategory,
      season: new Date().getFullYear(),
      leaders,
      total: playerStatsMap.size
    });
  } catch (error) {
    console.error('Error fetching season leaders:', error);
    res.status(500).json({ error: 'Failed to fetch season leaders' });
  }
});

// GET /api/v1/players/top-by-stat - Get top players by any stat
router.get('/top-by-stat', async (req, res) => {
  try {
    const stat = (req.query.stat as string || 'PTS').toUpperCase();
    const topN = Math.min(parseInt(req.query.top_n as string) || 10, 100);

    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        stat,
        topN,
        players: [],
        message: 'No games available'
      });
    }

    // Collect all player stat occurrences
    const playerGames: any[] = [];

    scoreboard.games.forEach((game: any) => {
      [game.gameLeaders?.homeLeaders, game.gameLeaders?.awayLeaders].forEach((leader: any) => {
        if (!leader || !leader.personId) return;

        playerGames.push({
          playerId: leader.personId,
          name: leader.name || 'Unknown',
          team: leader.teamTricode || (game.homeTeam?.personId === leader.personId ? game.homeTeam?.teamTricode : game.awayTeam?.teamTricode),
          gameDate: game.gameDate,
          stat: stat,
          pts: leader.points || 0,
          reb: leader.rebounds || 0,
          ast: leader.assists || 0,
          stl: leader.steals || 0,
          blk: leader.blocks || 0,
          fg: leader.fieldGoalsMade || 0,
          ft: leader.freeThrowsMade || 0,
          '3p': leader.threePointersMade || 0
        });
      });
    });

    const statMap: Record<string, string> = {
      'PTS': 'pts',
      'REB': 'reb',
      'AST': 'ast',
      'STL': 'stl',
      'BLK': 'blk',
      'FG': 'fg',
      'FT': 'ft',
      '3P': '3p'
    };

    const statKey = (statMap[stat] || 'pts') as keyof typeof playerGames[0];

    const topPlayers = playerGames
      .sort((a, b) => (b[statKey] as number) - (a[statKey] as number))
      .slice(0, topN)
      .map((p, idx) => ({
        rank: idx + 1,
        playerId: p.playerId,
        name: p.name,
        team: p.team,
        stat,
        value: p[statKey],
        gameDate: p.gameDate
      }));

    res.json({
      stat,
      topN,
      total: topPlayers.length,
      players: topPlayers
    });
  } catch (error) {
    console.error('Error fetching top players by stat:', error);
    res.status(500).json({ error: 'Failed to fetch players by stat' });
  }
});

// GET /api/v1/players/:id/game-log - Get player's game log
router.get('/:id/game-log', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const season = req.query.season as string;
    const limit = parseInt(req.query.limit as string) || 20;

    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.json({
        playerId,
        season: season || new Date().getFullYear().toString(),
        games: [],
        message: 'No games available'
      });
    }

    const gameLog: any[] = [];

    scoreboard.games.forEach((game: any) => {
      [
        { leader: game.gameLeaders?.homeLeaders, teamTricode: game.homeTeam?.teamTricode, opponent: game.awayTeam?.teamTricode },
        { leader: game.gameLeaders?.awayLeaders, teamTricode: game.awayTeam?.teamTricode, opponent: game.homeTeam?.teamTricode }
      ].forEach(({ leader, teamTricode, opponent }) => {
        if (leader?.personId === playerId) {
          gameLog.push({
            gameDate: game.gameDate,
            opponent,
            team: teamTricode,
            points: leader.points || 0,
            rebounds: leader.rebounds || 0,
            assists: leader.assists || 0,
            steals: leader.steals || 0,
            blocks: leader.blocks || 0,
            turnovers: leader.turnovers || 0,
            fouls: leader.fouls || 0,
            minutesPlayed: leader.minutes || 0,
            gameStatus: game.gameStatusText || 'Final'
          });
        }
      });
    });

    // Sort by date descending
    gameLog.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());

    res.json({
      playerId,
      season: season || new Date().getFullYear().toString(),
      games: gameLog.slice(0, limit),
      total: gameLog.length
    });
  } catch (error) {
    console.error('Error fetching player game log:', error);
    res.status(500).json({ error: 'Failed to fetch player game log' });
  }
});

// GET /api/v1/players/:id - Get player details
router.get('/:id', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    const scoreboardData = await dataCache.getScoreboard();
    const scoreboard = scoreboardData?.scoreboard;

    if (!scoreboard || !scoreboard.games) {
      return res.status(404).json({
        error: 'Player not found',
        playerId
      });
    }

    // Find player in game leaders
    let playerData: any = null;
    let stats = {
      gamesPlayed: 0,
      totalPoints: 0,
      totalRebounds: 0,
      totalAssists: 0,
      avgPoints: 0,
      avgRebounds: 0,
      avgAssists: 0
    };

    scoreboard.games.forEach((game: any) => {
      // Check home team leaders
      if (game.gameLeaders?.homeLeaders?.personId === playerId) {
        const leader = game.gameLeaders.homeLeaders;
        if (!playerData) {
          playerData = {
            playerId: leader.personId,
            name: leader.name || 'Unknown',
            team: game.homeTeam?.teamTricode,
            teamId: game.homeTeam?.teamId,
            teamName: game.homeTeam?.teamName,
            position: leader.position || 'Unknown'
          };
        }
        stats.gamesPlayed++;
        stats.totalPoints += leader.points || 0;
        stats.totalRebounds += leader.rebounds || 0;
        stats.totalAssists += leader.assists || 0;
      }

      // Check away team leaders
      if (game.gameLeaders?.awayLeaders?.personId === playerId) {
        const leader = game.gameLeaders.awayLeaders;
        if (!playerData) {
          playerData = {
            playerId: leader.personId,
            name: leader.name || 'Unknown',
            team: game.awayTeam?.teamTricode,
            teamId: game.awayTeam?.teamId,
            teamName: game.awayTeam?.teamName,
            position: leader.position || 'Unknown'
          };
        }
        stats.gamesPlayed++;
        stats.totalPoints += leader.points || 0;
        stats.totalRebounds += leader.rebounds || 0;
        stats.totalAssists += leader.assists || 0;
      }
    });

    if (!playerData) {
      return res.status(404).json({
        error: 'Player not found',
        playerId
      });
    }

    if (stats.gamesPlayed > 0) {
      stats.avgPoints = parseFloat((stats.totalPoints / stats.gamesPlayed).toFixed(1));
      stats.avgRebounds = parseFloat((stats.totalRebounds / stats.gamesPlayed).toFixed(1));
      stats.avgAssists = parseFloat((stats.totalAssists / stats.gamesPlayed).toFixed(1));
    }

    res.json({
      player: playerData,
      stats
    });
  } catch (error) {
    console.error('Error fetching player details:', error);
    res.status(500).json({ error: 'Failed to fetch player details' });
  }
});

export default router;