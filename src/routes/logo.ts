import express from 'express'; 

const router = express.Router();


// Valid NBA team codes
const validTeamCodes = [
  'ATL', 'BKN', 'BOS', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
  'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'
];

/**
 * Get logo URL for a team by team code
 * GET /api/v1/logo/:teamCode
 */
/**
 * Get logo URL for a team by team code
 * GET /api/v1/logo/:teamCode
 */
router.get('/:teamCode', (req, res) => {
  const { teamCode } = req.params || {};
  const uppercaseCode = teamCode ? teamCode.toUpperCase() : '';

  // Validate team code
  if (!uppercaseCode || !validTeamCodes.includes(uppercaseCode)) {
   console.log(`Invalid team code requested: ${teamCode}`);
    return res.status(400).json({
      error: 'Invalid team code',
      message: `Team code '${teamCode}' is not valid. Valid codes are: ${validTeamCodes.join(', ')}`
    });
  }

 console.log(`Logo requested for team: ${uppercaseCode}`);

  try {
    // Simple approach: construct URL directly
    const logoUrl = `/team-logo/${uppercaseCode}.png`;

    res.json({
      teamCode: uppercaseCode,
      logoUrl: logoUrl,
      filename: `${uppercaseCode}.png`
    });
  } catch (error) {
   console.log(`Error processing logo request for ${teamCode}:`, error);
    res.status(500).json({ error: 'Failed to fetch logo URL' });
  }
});

/**
 * Get logo URLs for multiple teams
 * GET /api/v1/logos?teams=CHI,MIA,DAL
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
          logoUrl: `/team-logo/${teamCode}.png`,
          filename: `${teamCode}.png`
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
  } catch (error) {
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
      logoUrl: `/team-logo/${code}.png`
    }));

    res.json({
      count: teams.length,
      teams: teams
    });
  } catch (error) {
   console.log('Error fetching team codes:', error);
    res.status(500).json({ error: 'Failed to fetch team codes' });
  }
});

export default router;
