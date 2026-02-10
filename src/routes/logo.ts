import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();


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
      path.join(process.cwd(), 'assets', 'logos'),
      path.join(__dirname, '..', 'assets', 'logos'),
      path.join(__dirname, '..', '..', 'assets', 'logos')
    ];

    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`__dirname: ${__dirname}`);

    const availableDirs: { [key: string]: string[] } = {};
    let foundDir = null;

    for (const dir of possibleDirs) {
      console.log(`Checking directory: ${dir}`);
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
          availableDirs[dir] = files;
          console.log(`  ✓ Found ${files.length} PNG files`);
          if (!foundDir) foundDir = dir;
        } catch (e) {
          console.log(`  Error reading directory: ${e}`);
        }
      } else {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to list logos', details: String(error) });
  }
});


/**
 * Get logos for a specific team code
 * GET /api/v1/logo/team?code=ATL
 */
router.get('/team/:code', (req, res) => {
  try {
    let { code } = req.params; 

    const logoPath = path.join(process.cwd(), 'assets', 'logos', `${code.toUpperCase()}`);
    if(!fs.existsSync(logoPath)) {
      console.warn(`Logo file not found: ${logoPath}`);
      return res.json({ success: false, error: `Invalid or missing team code: ${code}` });
    }
    return res.sendFile(logoPath, err => {
      if (err) {
        console.error(`Error sending file ${logoPath}:`, err);
        res.json({ success: false, error: 'Logo not found' });
      }
    });

  } catch (error) {
    console.log('Error fetching team codes:', error);
    res.json({ success: false, error: 'Failed to fetch team codes ' });
  }
});


export default router;
