"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scoreboard_1 = require("../services/scoreboard");
const dataCache_1 = require("../services/dataCache");
const router = express_1.default.Router();
// GET /api/scoreboard - Get live NBA scores
router.get('/', async (req, res) => {
    try {
        console.log('Scoreboard route called');
        const scoreboard = await dataCache_1.dataCache.getScoreboard();
        console.log('Scoreboard data:', scoreboard ? 'found' : 'null');
        if (!scoreboard) {
            return res.status(503).json({ error: 'Scoreboard data not available' });
        }
        res.json(scoreboard);
    }
    catch (error) {
        console.error('Error fetching scoreboard:', error);
        res.status(500).json({ error: 'Failed to fetch scoreboard' });
    }
});
// GET /api/scoreboard/playbyplay/:gameId - Get play-by-play for a game
router.get('/playbyplay/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const playByPlay = await (0, scoreboard_1.getPlayByPlay)(gameId);
        res.json(playByPlay);
    }
    catch (error) {
        console.error('Error fetching play-by-play:', error);
        res.status(500).json({ error: 'Failed to fetch play-by-play' });
    }
});
// GET /api/v1/scoreboard/game/:gameId/boxscore - Get box score for a game
router.get('/game/:gameId/boxscore', async (req, res) => {
    try {
        const { gameId } = req.params;
        const scoreboardData = await dataCache_1.dataCache.getScoreboard();
        const scoreboard = scoreboardData?.scoreboard;
        if (!scoreboard || !scoreboard.games) {
            return res.status(404).json({
                error: 'Game not found',
                gameId
            });
        }
        const game = scoreboard.games.find((g) => g.gameId === gameId);
        if (!game) {
            return res.status(404).json({
                error: 'Game not found',
                gameId
            });
        }
        // Aggregate player stats from game leaders
        const extractPlayerStats = (leaderData, teamTricode, teamName) => {
            if (!leaderData)
                return null;
            return {
                playerId: leaderData.personId,
                name: leaderData.name,
                position: leaderData.position || 'Unknown',
                points: leaderData.points || 0,
                rebounds: leaderData.rebounds || 0,
                assists: leaderData.assists || 0,
                steals: leaderData.steals || 0,
                blocks: leaderData.blocks || 0,
                turnovers: leaderData.turnovers || 0,
                fouls: leaderData.fouls || 0,
                minutes: leaderData.minutes || 0,
                team: teamTricode,
                teamName: teamName
            };
        };
        const homeTeam = game.homeTeam || {};
        const awayTeam = game.awayTeam || {};
        const boxScore = {
            gameId,
            gameDate: game.gameDate || new Date().toISOString(),
            status: game.gameStatusText || 'Unknown',
            home_Team: {
                teamId: homeTeam.teamId,
                teamName: homeTeam.teamName,
                teamTricode: homeTeam.teamTricode,
                score: homeTeam.score || 0,
                players: [
                    game.gameLeaders?.homeLeaders && extractPlayerStats(game.gameLeaders.homeLeaders, homeTeam.teamTricode, homeTeam.teamName)
                ].filter(p => p),
                stats: {
                    totalPoints: homeTeam.score || 0,
                    totalRebounds: 0,
                    totalAssists: 0,
                    totalSteals: 0,
                    totalBlocks: 0,
                    totalTurnovers: 0
                }
            },
            away_Team: {
                teamId: awayTeam.teamId,
                teamName: awayTeam.teamName,
                teamTricode: awayTeam.teamTricode,
                score: awayTeam.score || 0,
                players: [
                    game.gameLeaders?.awayLeaders && extractPlayerStats(game.gameLeaders.awayLeaders, awayTeam.teamTricode, awayTeam.teamName)
                ].filter(p => p),
                stats: {
                    totalPoints: awayTeam.score || 0,
                    totalRebounds: 0,
                    totalAssists: 0,
                    totalSteals: 0,
                    totalBlocks: 0,
                    totalTurnovers: 0
                }
            }
        };
        res.json(boxScore);
    }
    catch (error) {
        console.error('Error fetching box score:', error);
        res.status(500).json({ error: 'Failed to fetch box score' });
    }
});
// GET /api/v1/scoreboard/game/:gameId/key-moments - Get key moments for a game
router.get('/game/:gameId/key-moments', async (req, res) => {
    try {
        const { gameId } = req.params;
        const playbyplay = await (0, scoreboard_1.getPlayByPlay)(gameId);
        if (!playbyplay || !playbyplay.plays) {
            return res.json({
                gameId,
                moments: [],
                message: 'No play-by-play data available'
            });
        }
        const plays = playbyplay.plays;
        const moments = [];
        let lastLeadTeam = '';
        let lastScore = { home: 0, away: 0 };
        // Detect key moments from play-by-play
        for (let i = 0; i < plays.length; i++) {
            const play = plays[i];
            const homeScore = parseInt(play.score_home || '0');
            const awayScore = parseInt(play.score_away || '0');
            // Detect lead changes
            const homeLeading = homeScore > awayScore;
            const currentLeadTeam = homeLeading ? 'home' : 'away';
            if (lastLeadTeam && lastLeadTeam !== currentLeadTeam && (lastScore.home !== 0 || lastScore.away !== 0)) {
                moments.push({
                    type: 'lead_change',
                    period: play.period,
                    clock: play.clock,
                    description: `Lead change: ${homeLeading ? 'Home' : 'Away'} team takes the lead`,
                    homeScore,
                    awayScore,
                    play: play.description || 'Lead change'
                });
            }
            // Detect close games (within 3 points)
            const scoreDiff = Math.abs(homeScore - awayScore);
            if (scoreDiff <= 3 && lastScore && Math.abs(lastScore.home - lastScore.away) > 3) {
                moments.push({
                    type: 'clutch_play',
                    period: play.period,
                    clock: play.clock,
                    description: 'Game tightens up',
                    homeScore,
                    awayScore,
                    play: play.description || 'Clutch moment'
                });
            }
            lastLeadTeam = currentLeadTeam;
            lastScore = { home: homeScore, away: awayScore };
        }
        res.json({
            gameId,
            moments: moments.slice(-10), // Return last 10 moments
            total: moments.length
        });
    }
    catch (error) {
        console.error('Error fetching key moments:', error);
        res.status(500).json({ error: 'Failed to fetch key moments' });
    }
});
// GET /api/v1/scoreboard/game/:gameId/win-probability - Get win probability for a game
router.get('/game/:gameId/win-probability', async (req, res) => {
    try {
        const { gameId } = req.params;
        const scoreboardData = await dataCache_1.dataCache.getScoreboard();
        const scoreboard = scoreboardData?.scoreboard;
        if (!scoreboard || !scoreboard.games) {
            return res.status(404).json({
                error: 'Game not found',
                gameId
            });
        }
        const game = scoreboard.games.find((g) => g.gameId === gameId);
        if (!game) {
            return res.status(404).json({
                error: 'Game not found',
                gameId
            });
        }
        const homeTeam = game.homeTeam || {};
        const awayTeam = game.awayTeam || {};
        // Calculate simple win probability based on current score and team records
        const homeWinPct = homeTeam.wins ? homeTeam.wins / (homeTeam.wins + (homeTeam.losses || 0)) : 0.5;
        const awayWinPct = awayTeam.wins ? awayTeam.wins / (awayTeam.wins + (awayTeam.losses || 0)) : 0.5;
        // Home court advantage (3%)
        const homeAdvantage = 0.03;
        let adjustedHomeProb = homeWinPct + homeAdvantage;
        // Adjust based on current score if game is in progress
        if (game.gameStatus === 2) { // Live game
            const homeScore = homeTeam.score || 0;
            const awayScore = awayTeam.score || 0;
            const totalScore = homeScore + awayScore;
            if (totalScore > 0) {
                // Weight current score with historical probability (70% current, 30% historical)
                const scoreBasedProb = homeScore / totalScore;
                adjustedHomeProb = (scoreBasedProb * 0.7) + (adjustedHomeProb * 0.3);
            }
        }
        // Clamp between 0.01 and 0.99
        const homeWinProb = Math.min(Math.max(adjustedHomeProb, 0.01), 0.99);
        const awayWinProb = 1 - homeWinProb;
        res.json({
            gameId,
            home_Team: homeTeam.teamName,
            away_Team: awayTeam.teamName,
            homeWinProbability: parseFloat(homeWinProb.toFixed(3)),
            awayWinProbability: parseFloat(awayWinProb.toFixed(3)),
            homeScore: homeTeam.score || 0,
            awayScore: awayTeam.score || 0,
            period: game.period || 0,
            gameClock: game.gameClock || '00:00',
            gameStatus: game.gameStatusText,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching win probability:', error);
        res.status(500).json({ error: 'Failed to fetch win probability' });
    }
});
exports.default = router;
//# sourceMappingURL=scoreboard.js.map