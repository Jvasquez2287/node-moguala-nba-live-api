"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Valid NBA team codes
const validTeamCodes = [
    'ATL', 'BKN', 'BOS', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
    'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
    'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'
];
/**
 * Get logo image for a team by team code
 * GET /api/v1/logo/:teamCode?size=150
 * size parameter: 150 or 250 (default: 150)
 */
router.get('/:teamCode', (req, res) => {
    const { teamCode } = req.params || {};
    const size = req.query.size || '150';
    const uppercaseCode = teamCode ? teamCode.toUpperCase() : '';
    console.log(`Received request for logo. Team code: ${teamCode}, Size: ${size}`);
    // Validate team code
    if (!uppercaseCode || !validTeamCodes.includes(uppercaseCode)) {
        console.log(`Invalid team code requested: ${teamCode}`);
        return res.status(400).json({
            error: 'Invalid team code',
            message: `Team code '${teamCode}' is not valid. Valid codes are: ${validTeamCodes.join(', ')}`
        });
    }
    console.log(`Valid team code received: ${uppercaseCode}`);
    // Validate size parameter
    if (size !== '150' && size !== '250') {
        return res.status(400).json({
            error: 'Invalid size parameter',
            message: 'Size must be either 150 or 250'
        });
    }
    console.log(`Logo requested for team: ${uppercaseCode}, size: ${size}`);
    try {
        // Build the path to the logo file
        const logoPath = path_1.default.join(process.cwd(), 'assets', 'logos', `${size}x${size}`, `${uppercaseCode}.png`);
        // Check if file exists
        if (!fs_1.default.existsSync(logoPath)) {
            console.log(`Logo file not found: ${logoPath}`);
            return res.status(404).json({
                error: 'Logo not found',
                message: `Logo file for team ${uppercaseCode} not found`
            });
        }
        // Set the content type and send the file
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.sendFile(logoPath);
    }
    catch (error) {
        console.log(`Error processing logo request for ${teamCode}:`, error);
        res.status(500).json({ error: 'Failed to fetch logo' });
    }
});
/**
 * Get logo URLs for multiple teams
 * GET /api/v1/logos-batch?teams=CHI,MIA,DAL
 */
router.get('/logos-batch', (req, res) => {
    try {
        const { teams } = req.query;
        if (!teams || typeof teams !== 'string') {
            return res.status(400).json({
                error: 'Missing teams parameter',
                message: 'Please provide a comma-separated list of team codes (e.g., ?teams=CHI,MIA,DAL)'
            });
        }
        const teamCodes = teams.split(',').map(code => (code || '').toUpperCase().trim()).filter(code => code);
        const logos = teamCodes.map(teamCode => {
            const isValid = validTeamCodes.includes(teamCode);
            return {
                teamCode,
                valid: isValid,
                ...(isValid && {
                    logos: {
                        small: `/logos/150x150/${teamCode}.png`,
                        large: `/logos/250x250/${teamCode}.png`
                    }
                }),
                ...(!isValid && {
                    error: `Invalid team code '${teamCode}'`
                })
            };
        });
        res.json({
            logos: logos,
            validCount: logos.filter(l => l.valid).length,
            invalidCount: logos.filter(l => !l.valid).length
        });
    }
    catch (error) {
        console.log('Error fetching logos batch:', error);
        res.status(500).json({ error: 'Failed to fetch logos batch' });
    }
});
/**
 * List all available team codes
 * GET /api/v1/teams/codes
 */
router.get('/teams/codes', (req, res) => {
    try {
        const teams = validTeamCodes.map(code => ({
            code: code,
            logos: {
                small: `/logos/150x150/${code}.png`,
                large: `/logos/250x250/${code}.png`
            }
        }));
        res.json({
            count: teams.length,
            teams: teams
        });
    }
    catch (error) {
        console.log('Error fetching team codes:', error);
        res.status(500).json({ error: 'Failed to fetch team codes' });
    }
});
exports.default = router;
//# sourceMappingURL=logo.js.map