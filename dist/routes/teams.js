"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const teams_1 = require("../services/teams");
const router = express_1.default.Router();
// Get team statistics
router.get('/teams/stats', async (req, res) => {
    try {
        // TODO: Implement getTeamStats function
        res.status(501).json({ error: 'Not implemented yet' });
    }
    catch (error) {
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
        const team = await (0, teams_1.getTeam)(teamId);
        res.json(team);
    }
    catch (error) {
        console.log(`Error fetching team ${req.params.teamId}:`, error);
        res.status(500).json({ error: 'Failed to fetch team details' });
    }
});
// Get team game log
router.get('/teams/:teamId/game-log', async (req, res) => {
    try {
        // TODO: Implement getTeamGameLog function
        res.status(501).json({ error: 'Not implemented yet' });
    }
    catch (error) {
        console.log(`Error fetching game log for team ${req.params.teamId}:`, error);
        res.status(500).json({ error: 'Failed to fetch team game log' });
    }
});
// Get team player statistics
router.get('/teams/:teamId/player-stats', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId, 10);
        const season = req.query.season;
        if (isNaN(teamId)) {
            return res.status(400).json({ error: 'Invalid team ID' });
        }
        if (!season) {
            return res.status(400).json({ error: 'Season parameter is required' });
        }
        const playerStats = await (0, teams_1.getTeamPlayerStats)(teamId, season);
        res.json(playerStats);
    }
    catch (error) {
        console.log(`Error fetching player stats for team ${req.params.teamId}:`, error);
        res.status(500).json({ error: 'Failed to fetch team player stats' });
    }
});
// Get all teams
router.get('/teams', async (req, res) => {
    try {
        const teams = await (0, teams_1.getAllTeams)();
        res.json(teams);
    }
    catch (error) {
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
        const roster = await (0, teams_1.getTeamRoster)(teamId, season);
        res.json(roster);
    }
    catch (error) {
        console.log(`Error fetching roster for team ${req.params.teamId}:`, error);
        res.status(500).json({ error: 'Failed to fetch team roster' });
    }
});
exports.default = router;
//# sourceMappingURL=teams.js.map