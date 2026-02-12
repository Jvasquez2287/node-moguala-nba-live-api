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
        return res.json({
            cwd: process.cwd(),
            dirname: __dirname,
            checkedDirectories: possibleDirs,
            foundDirectory: foundDir,
            availableLogos: availableDirs,
            example: foundDir ? `Try: GET /api/v1/team-logo/ATL.png` : 'No logos directory found'
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Failed to list logos', details: String(error) });
    }
});
/**
 * Get logos for a specific team code
 * GET /api/v1/logo/team?code=ATL
 */
router.get('/:code', (req, res) => {
    try {
        let { code } = req.params;
        const logoPath = path_1.default.join(__dirname, '..', '..', 'assets', 'logos', `${code.toUpperCase()}`);
        if (!fs_1.default.existsSync(logoPath)) {
            console.warn(`Logo file not found: ${logoPath}`);
            return res.json({ success: false, error: `Invalid or missing team code: ${code}`,
                'path': logoPath });
        }
        return res.sendFile(logoPath, err => {
            if (err) {
                console.error(`Error sending file ${logoPath}:`, err);
                return res.json({ success: false, error: 'Logo not found' });
            }
        });
    }
    catch (error) {
        console.log('Error fetching team codes:', error);
        return res.json({ success: false, error: 'Failed to fetch team codes ' });
    }
});
exports.default = router;
//# sourceMappingURL=logo.js.map