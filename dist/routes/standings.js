"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dataCache_1 = require("../services/dataCache");
const router = express_1.default.Router();
// GET /api/v1/standings - Get NBA standings
router.get('/', async (req, res) => {
    try {
        const scoreboardData = await dataCache_1.dataCache.getScoreboard();
        const scoreboard = scoreboardData?.scoreboard;
        if (!scoreboard || !scoreboard.games) {
            return res.json({
                lastUpdated: new Date().toISOString(),
                conferences: []
            });
        }
        // Extract team standings from games
        const teamsMap = new Map();
        scoreboard.games.forEach((game) => {
            [game.homeTeam, game.awayTeam].forEach((team) => {
                if (team && !teamsMap.has(team.teamId)) {
                    teamsMap.set(team.teamId, {
                        teamId: team.teamId,
                        teamName: team.teamName,
                        teamCity: team.teamCity,
                        teamTricode: team.teamTricode,
                        wins: team.wins || 0,
                        losses: team.losses || 0,
                        winPct: team.wins && team.losses ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1) : '0.0'
                    });
                }
            });
        });
        // Map teams to divisions and conferences
        const teamToConference = {
            'BOS': { conf: 'Eastern', div: 'Atlantic' },
            'BRK': { conf: 'Eastern', div: 'Atlantic' },
            'NYK': { conf: 'Eastern', div: 'Atlantic' },
            'PHI': { conf: 'Eastern', div: 'Atlantic' },
            'TOR': { conf: 'Eastern', div: 'Atlantic' },
            'CHI': { conf: 'Eastern', div: 'Central' },
            'CLE': { conf: 'Eastern', div: 'Central' },
            'DET': { conf: 'Eastern', div: 'Central' },
            'IND': { conf: 'Eastern', div: 'Central' },
            'MIL': { conf: 'Eastern', div: 'Central' },
            'ATL': { conf: 'Eastern', div: 'Southeast' },
            'CHA': { conf: 'Eastern', div: 'Southeast' },
            'MIA': { conf: 'Eastern', div: 'Southeast' },
            'ORL': { conf: 'Eastern', div: 'Southeast' },
            'WAS': { conf: 'Eastern', div: 'Southeast' },
            'DEN': { conf: 'Western', div: 'Northwest' },
            'MIN': { conf: 'Western', div: 'Northwest' },
            'OKC': { conf: 'Western', div: 'Northwest' },
            'POR': { conf: 'Western', div: 'Northwest' },
            'UTA': { conf: 'Western', div: 'Northwest' },
            'GSW': { conf: 'Western', div: 'Pacific' },
            'LAC': { conf: 'Western', div: 'Pacific' },
            'LAL': { conf: 'Western', div: 'Pacific' },
            'PHX': { conf: 'Western', div: 'Pacific' },
            'SAC': { conf: 'Western', div: 'Pacific' },
            'DAL': { conf: 'Western', div: 'Southwest' },
            'HOU': { conf: 'Western', div: 'Southwest' },
            'MEM': { conf: 'Western', div: 'Southwest' },
            'NOP': { conf: 'Western', div: 'Southwest' },
            'SAS': { conf: 'Western', div: 'Southwest' }
        };
        // Build standings structure
        const conferences = {
            Eastern: {
                name: 'Eastern Conference',
                divisions: {
                    Atlantic: [],
                    Central: [],
                    Southeast: []
                }
            },
            Western: {
                name: 'Western Conference',
                divisions: {
                    Northwest: [],
                    Pacific: [],
                    Southwest: []
                }
            }
        };
        // Populate with teams
        teamsMap.forEach(team => {
            const divInfo = teamToConference[team.teamTricode];
            if (divInfo) {
                const conf = divInfo.conf === 'Eastern' ? conferences.Eastern : conferences.Western;
                const div = divInfo.div;
                conf.divisions[div].push(team);
            }
        });
        // Sort teams by wins within each division
        Object.values(conferences).forEach((conf) => {
            Object.values(conf.divisions).forEach((div) => {
                div.sort((a, b) => b.wins - a.wins);
            });
        });
        res.json({
            season: new Date().getFullYear(),
            conferences: [conferences.Eastern, conferences.Western],
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching standings:', error);
        res.status(500).json({ error: 'Failed to fetch standings' });
    }
});
// GET /api/v1/standings/season/:season - Get standings for a specific season
router.get('/season/:season', async (req, res) => {
    try {
        const seasonParam = req.params.season; // Format: YYYY-YY (e.g., 2025-26)
        const scoreboardData = await dataCache_1.dataCache.getScoreboard();
        const scoreboard = scoreboardData?.scoreboard;
        if (!scoreboard || !scoreboard.games) {
            return res.json({
                season: seasonParam,
                conferences: [],
                lastUpdated: new Date().toISOString()
            });
        }
        // Extract team standings from games
        const teamsMap = new Map();
        scoreboard.games.forEach((game) => {
            [game.homeTeam, game.awayTeam].forEach((team) => {
                if (team && !teamsMap.has(team.teamId)) {
                    teamsMap.set(team.teamId, {
                        teamId: team.teamId,
                        teamName: team.teamName,
                        teamCity: team.teamCity,
                        teamTricode: team.teamTricode,
                        wins: team.wins || 0,
                        losses: team.losses || 0,
                        winPct: team.wins && team.losses ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1) : '0.0'
                    });
                }
            });
        });
        // Map teams to divisions and conferences
        const teamToConference = {
            'BOS': { conf: 'Eastern', div: 'Atlantic' },
            'BRK': { conf: 'Eastern', div: 'Atlantic' },
            'NYK': { conf: 'Eastern', div: 'Atlantic' },
            'PHI': { conf: 'Eastern', div: 'Atlantic' },
            'TOR': { conf: 'Eastern', div: 'Atlantic' },
            'CHI': { conf: 'Eastern', div: 'Central' },
            'CLE': { conf: 'Eastern', div: 'Central' },
            'DET': { conf: 'Eastern', div: 'Central' },
            'IND': { conf: 'Eastern', div: 'Central' },
            'MIL': { conf: 'Eastern', div: 'Central' },
            'ATL': { conf: 'Eastern', div: 'Southeast' },
            'CHA': { conf: 'Eastern', div: 'Southeast' },
            'MIA': { conf: 'Eastern', div: 'Southeast' },
            'ORL': { conf: 'Eastern', div: 'Southeast' },
            'WAS': { conf: 'Eastern', div: 'Southeast' },
            'DEN': { conf: 'Western', div: 'Northwest' },
            'MIN': { conf: 'Western', div: 'Northwest' },
            'OKC': { conf: 'Western', div: 'Northwest' },
            'POR': { conf: 'Western', div: 'Northwest' },
            'UTA': { conf: 'Western', div: 'Northwest' },
            'GSW': { conf: 'Western', div: 'Pacific' },
            'LAC': { conf: 'Western', div: 'Pacific' },
            'LAL': { conf: 'Western', div: 'Pacific' },
            'PHX': { conf: 'Western', div: 'Pacific' },
            'SAC': { conf: 'Western', div: 'Pacific' },
            'DAL': { conf: 'Western', div: 'Southwest' },
            'HOU': { conf: 'Western', div: 'Southwest' },
            'MEM': { conf: 'Western', div: 'Southwest' },
            'NOP': { conf: 'Western', div: 'Southwest' },
            'SAS': { conf: 'Western', div: 'Southwest' }
        };
        // Build standings structure
        const conferences = {
            Eastern: {
                name: 'Eastern Conference',
                divisions: {
                    Atlantic: [],
                    Central: [],
                    Southeast: []
                }
            },
            Western: {
                name: 'Western Conference',
                divisions: {
                    Northwest: [],
                    Pacific: [],
                    Southwest: []
                }
            }
        };
        // Populate with teams
        teamsMap.forEach(team => {
            const divInfo = teamToConference[team.teamTricode];
            if (divInfo) {
                const conf = divInfo.conf === 'Eastern' ? conferences.Eastern : conferences.Western;
                const div = divInfo.div;
                conf.divisions[div].push(team);
            }
        });
        // Sort teams by wins within each division
        Object.values(conferences).forEach((conf) => {
            Object.values(conf.divisions).forEach((div) => {
                div.sort((a, b) => b.wins - a.wins);
            });
        });
        res.json({
            season: seasonParam,
            conferences: [conferences.Eastern, conferences.Western],
            lastUpdated: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error fetching standings by season:', error);
        res.status(500).json({ error: 'Failed to fetch standings by season' });
    }
});
exports.default = router;
//# sourceMappingURL=standings.js.map