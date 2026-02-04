import express from 'express';
import * as winston from 'winston';
import { getLeagueLeaders } from '../services/league';
import { leagueLeadersResponseSchema } from '../schemas/league';

const router = express.Router();

// Get league leaders for a stat category
router.get('/leaders', async (req, res) => {
  try {
    const { stat_category, season } = req.query;

    // Validate stat category
    const category = (stat_category as string) || 'PTS';
    const validCategories = ['PTS', 'REB', 'AST', 'STL', 'BLK'];
    if (!validCategories.includes(category.toUpperCase())) {
      return res.status(400).json({
        error: `Invalid stat category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // Validate season format if provided
    let seasonParam: string | undefined;
    if (season && typeof season === 'string') {
      const seasonRegex = /^\d{4}-\d{2}$/;
      if (!seasonRegex.test(season)) {
        return res.status(400).json({ error: 'Invalid season format. Use YYYY-YY' });
      }
      seasonParam = season;
    }

    const leadersData = await getLeagueLeaders(category, seasonParam, 5);

    if (!leadersData) {
      return res.status(404).json({ error: `No league leaders found for category ${category}` });
    }

    // Validate response
    const { error } = leagueLeadersResponseSchema.validate(leadersData);
    if (error) {
     console.log('League leaders validation error:', error);
      return res.status(500).json({ error: 'Invalid league leaders data' });
    }

    res.json(leadersData);
  } catch (error) {
   console.log('Error fetching league leaders:', error);
    res.status(500).json({ error: 'Failed to fetch league leaders' });
  }
});

export default router;