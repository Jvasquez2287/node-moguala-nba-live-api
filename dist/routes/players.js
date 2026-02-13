"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const players_1 = require("../services/players");
const router = express_1.default.Router();
// Get player details
router.get('/player/:playerId', async (req, res) => {
    try {
        const playerId = req.params.playerId;
        if (!playerId) {
            return res.json({ error: 'Player ID is required' });
        }
        const player = await (0, players_1.getPlayer)(playerId);
        return res.json(player);
    }
    catch (error) {
        console.log(`Error fetching player ${req.params.playerId}:`, error);
        return res.json({ error: 'Failed to fetch player details' });
    }
});
// Search players
router.get('/players/search/:searchTerm', async (req, res) => {
    try {
        const searchTerm = req.params.searchTerm;
        if (!searchTerm || searchTerm.trim().length === 0) {
            return res.json({ error: 'Search term is required' });
        }
        const players = await (0, players_1.searchPlayers)(searchTerm.trim());
        return res.json(players);
    }
    catch (error) {
        console.log('Error searching players:', error);
        return res.json({ error: 'Failed to search players' });
    }
});
// Get season leaders
router.get('/players/season-leaders', async (req, res) => {
    try {
        const { season } = req.query;
        // Validate season format if provided
        let seasonParam = '2024-25'; // Default season
        if (season && typeof season === 'string') {
            const seasonRegex = /^\d{4}-\d{2}$/;
            if (!seasonRegex.test(season)) {
                return res.json({ error: 'Invalid season format. Use YYYY-YY' });
            }
            seasonParam = season;
        }
        const seasonLeaders = await (0, players_1.getSeasonLeaders)(seasonParam);
        return res.json(seasonLeaders);
    }
    catch (error) {
        console.log('Error fetching season leaders:', error);
        return res.json({ error: 'Failed to fetch season leaders' });
    }
});
// Get top players by stat
router.get('/players/top-by-stat', async (req, res) => {
    try {
        // TODO: Implement getTopPlayersByStat function
        return res.json({ error: 'Not implemented yet' });
    }
    catch (error) {
        console.log('Error fetching top players by stat:', error);
        return res.json({ error: 'Failed to fetch top players by stat' });
    }
});
// Get player game log
router.get('/player/:playerId/game-log', async (req, res) => {
    try {
        // TODO: Implement getPlayerGameLog function
        return res.json({ error: 'Not implemented yet' });
    }
    catch (error) {
        console.log('Error fetching player game log:', error);
        return res.json({ error: 'Failed to fetch player game log' });
    }
});
// Get league roster (all active players)
router.get('/players/league-roster', async (req, res) => {
    try {
        const players = await (0, players_1.getLeagueRoster)();
        return res.json(players);
    }
    catch (error) {
        console.log('Error fetching league roster:', error);
        return res.json({ error: 'Failed to fetch league roster' });
    }
});
exports.default = router;
//# sourceMappingURL=players.js.map