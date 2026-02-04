import express from 'express';
import * as winston from 'winston';
import { getSeasonStandings } from '../services/standings';
import { standingsResponseSchema } from '../schemas/standings';

const router = express.Router();

// Get standings for a season
router.get('/season/:season', async (req, res) => {
  try {
    const { season } = req.params;

    // Validate season format (YYYY-YY)
    const seasonRegex = /^\d{4}-\d{2}$/;
    if (!seasonRegex.test(season)) {
      return res.status(400).json({ error: 'Invalid season format. Use YYYY-YY' });
    }

    const standingsData = await getSeasonStandings(season);

    if (!standingsData) {
      return res.status(404).json({ error: `No standings found for season ${season}` });
    }

    // Validate response
    const { error } = standingsResponseSchema.validate(standingsData);
    if (error) {
     console.log('Standings validation error:', error);
      return res.status(500).json({ error: 'Invalid standings data' });
    }

    res.json(standingsData);
  } catch (error) {
   console.log('Error fetching standings:', error);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
});

export default router;