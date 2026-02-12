"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dataCache_1 = require("../services/dataCache");
const predictions_1 = require("../services/predictions");
const predictions_2 = require("../schemas/predictions");
const router = express_1.default.Router();
// Python API base URL (nba-tracker-api)
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://nba-v1.m-api.net:8000/api/v1';
// Simple prediction algorithm based on team record
function calculatePrediction(homeTeam, awayTeam) {
    const homeWinPct = homeTeam.wins ? homeTeam.wins / (homeTeam.wins + homeTeam.losses) : 0.5;
    const awayWinPct = awayTeam.wins ? awayTeam.wins / (awayTeam.wins + awayTeam.losses) : 0.5;
    // Home court advantage (about 3% win probability boost)
    const homeAdvantage = 0.03;
    const adjustedHomeWinPct = homeWinPct + homeAdvantage;
    const totalProb = adjustedHomeWinPct + awayWinPct;
    const homeConfidence = (adjustedHomeWinPct / totalProb) * 100;
    const prediction = homeConfidence > 50 ? 'home' : 'away';
    const confidence = Math.max(homeConfidence, 100 - homeConfidence);
    return { prediction, confidence: parseFloat(confidence.toFixed(1)) };
}
// GET /api/v1/predictions - Get game predictions
router.get('/predictions', async (req, res) => {
    try {
        const scoreboardData = await dataCache_1.dataCache.getScoreboard();
        const scoreboard = scoreboardData?.scoreboard;
        if (!scoreboard || !scoreboard.games) {
            return res.json({
                predictions: [],
                lastUpdated: new Date().toISOString()
            });
        }
        const predictions = scoreboard.games
            .filter((game) => game.gameStatus < 3) // Only live/upcoming games
            .map((game) => {
            const { prediction, confidence } = calculatePrediction(game.homeTeam, game.awayTeam);
            return {
                gameId: game.gameId,
                away_Team: game.awayTeam?.teamName,
                home_Team: game.homeTeam?.teamName,
                prediction,
                confidence,
                predictedWinner: prediction === 'home' ? game.homeTeam?.teamName : game.awayTeam?.teamName,
                homeTeamRecord: `${game.homeTeam?.wins || 0}-${game.homeTeam?.losses || 0}`,
                awayTeamRecord: `${game.awayTeam?.wins || 0}-${game.awayTeam?.losses || 0}`,
                gameStatus: game.gameStatus,
                gameStatusText: game.gameStatusText
            };
        });
        return res.json({
            predictions: predictions.sort((a, b) => b.confidence - a.confidence),
            total: predictions.length,
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching predictions:', error);
        return res.json({ error: 'Failed to fetch predictions' });
    }
});
// GET /api/v1/predictions/date/:date - Get predictions for a specific date
router.get('/predictions/date/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const { season } = req.query;
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }
        // Validate season format if provided (YYYY-YY)
        let seasonParam = season;
        if (!seasonParam) {
            // Default to current season
            const now = new Date();
            const year = now.getFullYear();
            const nextYear = year + 1;
            seasonParam = now.getMonth() >= 9 ? `${year}-${nextYear.toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
        }
        const seasonRegex = /^\d{4}-\d{2}$/;
        if (!seasonRegex.test(seasonParam)) {
            return res.json({ error: 'Invalid season format. Use YYYY-YY' });
        }
        const predictionsData = await (0, predictions_1.predictGamesForDate)(date, seasonParam);
        // Filter games by date (gameId contains date like 0021900001 where 0021900 = season+date)
        // Or match against gameDate field if available
        if (!predictionsData) {
            return res.json({ error: `No predictions available for date ${date}` });
        }
        // Validate response
        const { error } = predictions_2.predictionsResponseSchema.validate(predictionsData);
        if (error) {
            console.log('Predictions validation error:', error);
            return res.json({ error: 'Invalid predictions data' });
        }
        return res.json(predictionsData);
    }
    catch (error) {
        console.log('Error fetching predictions:', error);
        res.json({ error: 'Failed to fetch predictions' });
    }
});
// GET /api/v1/predictions/:gameId - Get prediction for specific game
router.get('/predictions/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const scoreboardData = await dataCache_1.dataCache.getScoreboard();
        const scoreboard = scoreboardData?.scoreboard;
        if (!scoreboard || !scoreboard.games) {
            return res.json({
                error: 'Game not found',
                gameId
            });
        }
        const game = scoreboard.games.find((g) => g.gameId === gameId);
        if (!game) {
            return res.json({
                error: 'Game not found',
                gameId
            });
        }
        const { prediction, confidence } = calculatePrediction(game.homeTeam, game.awayTeam);
        return res.json({
            gameId,
            away_Team: game.awayTeam?.teamName,
            home_Team: game.homeTeam?.teamName,
            prediction,
            confidence,
            predictedWinner: prediction === 'home' ? game.homeTeam?.teamName : game.awayTeam?.teamName,
            homeTeamRecord: `${game.homeTeam?.wins || 0}-${game.homeTeam?.losses || 0}`,
            awayTeamRecord: `${game.awayTeam?.wins || 0}-${game.awayTeam?.losses || 0}`,
            gameStatus: game.gameStatus,
            gameStatusText: game.gameStatusText,
            notes: 'Predictions based on team win percentage and home court advantage'
        });
    }
    catch (error) {
        console.error('Error fetching game prediction:', error);
        res.json({ error: 'Failed to fetch game prediction' });
    }
});
exports.default = router;
//# sourceMappingURL=predictions.js.map