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
 * Debug endpoint - List all available logos
 * GET /api/v1/logo/debug/list
 */
router.get('/debug/list', (req, res) => {
    try {
        const possibleDirs = [
            path_1.default.join(process.cwd(), 'assets', 'logos'),
            path_1.default.join(__dirname, '..', 'assets', 'logos'),
            path_1.default.join(__dirname, '..', '..', 'assets', 'logos')
        ];
        console.log(`Current working directory: ${process.cwd()}`);
        console.log(`__dirname: ${__dirname}`);
        const availableDirs = {};
        let foundDir = null;
        for (const dir of possibleDirs) {
            console.log(`Checking directory: ${dir}`);
            if (fs_1.default.existsSync(dir)) {
                try {
                    const files = fs_1.default.readdirSync(dir).filter(f => f.endsWith('.png'));
                    availableDirs[dir] = files;
                    console.log(`  ✓ Found ${files.length} PNG files`);
                    if (!foundDir)
                        foundDir = dir;
                }
                catch (e) {
                    console.log(`  Error reading directory: ${e}`);
                }
            }
            else {
                console.log(`  Directory does not exist`);
            }
        }
        res.json({
            cwd: process.cwd(),
            dirname: __dirname,
            checkedDirectories: possibleDirs,
            foundDirectory: foundDir,
            availableLogos: availableDirs,
            example: foundDir ? `Try: GET /api/v1/team-logo/ATL.png` : 'No logos directory found'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to list logos', details: String(error) });
    }
});
/**
 * Get logo URLs for multiple teams
 * GET /api/v1/logo/logos-batch?teams=CHI,MIA,DAL
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
 * GET /api/v1/logo/teams/codes
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
/**
 * Get logo image for a team by team code
 * GET /api/v1/logo/:teamCode or /api/v1/team-logo/:teamCode (.png extension optional)
 */
router.get('/:teamCode', (req, res) => {
    let { teamCode } = req.params || {};
    // Remove .png extension if provided
    if (teamCode && teamCode.endsWith('.png')) {
        teamCode = teamCode.slice(0, -4);
    }
    const uppercaseCode = teamCode ? teamCode.toUpperCase() : '';
    console.log(`Received request for logo. Team code: ${teamCode}`);
    console.log(`Current working directory: ${process.cwd()}`);
    // Validate team code
    if (!uppercaseCode || !validTeamCodes.includes(uppercaseCode)) {
        console.log(`Invalid team code requested: ${teamCode}`);
        return res.status(400).json({
            error: 'Invalid team code',
            message: `Team code '${teamCode}' is not valid. Valid codes are: ${validTeamCodes.join(', ')}`
        });
    }
    console.log(`Valid team code received: ${uppercaseCode}`);
    try {
        // Try multiple possible paths
        const possiblePaths = [
            path_1.default.join(process.cwd(), 'assets', 'logos', `${uppercaseCode}.png`),
            path_1.default.join(__dirname, '..', 'assets', 'logos', `${uppercaseCode}.png`),
            path_1.default.join(__dirname, '..', '..', 'assets', 'logos', `${uppercaseCode}.png`)
        ];
        console.log(`Checking paths for ${uppercaseCode}:`, possiblePaths);
        let logoPath = null;
        for (const possiblePath of possiblePaths) {
            console.log(`  Checking: ${possiblePath}`);
            if (fs_1.default.existsSync(possiblePath)) {
                logoPath = possiblePath;
                console.log(`  ✓ Found at: ${logoPath}`);
                break;
            }
        }
        if (!logoPath) {
            console.log(`Logo file not found at any location for team ${uppercaseCode}`);
            return res.status(404).json({
                error: 'Logo not found',
                message: `Logo file for team ${uppercaseCode} not found. Checked paths: ${possiblePaths.join(', ')}`
            });
        }
        // Set the content type and send the file
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        console.log(`Reading file: ${logoPath}`);
        // Read and send the file using fs.readFile
        fs_1.default.readFile(logoPath, (err, data) => {
            if (err) {
                console.error(`Error reading file ${logoPath}:`, err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to read file', details: err.message });
                }
            }
            else {
                console.log(`File read successfully, sending ${data.length} bytes from ${logoPath}`);
                res.send(data);
            }
        });
    }
    catch (error) {
        console.error(`Error processing logo request for ${teamCode}:`, error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to fetch logo', details: error instanceof Error ? error.message : String(error) });
        }
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