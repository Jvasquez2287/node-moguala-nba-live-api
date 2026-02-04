import express from 'express';
import * as winston from 'winston';
import { predictGamesForDate } from '../../../src/services/predictions';
import { predictionsResponseSchema } from '../schemas/predictions';

const router = express.Router();

// Get predictions for a date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { season } = req.query;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate season format if provided (YYYY-YY)
    let seasonParam = season as string;
    if (!seasonParam) {
      // Default to current season
      const now = new Date();
      const year = now.getFullYear();
      const nextYear = year + 1;
      seasonParam = now.getMonth() >= 9 ? `${year}-${nextYear.toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
    }

    const seasonRegex = /^\d{4}-\d{2}$/;
    if (!seasonRegex.test(seasonParam)) {
      return res.status(400).json({ error: 'Invalid season format. Use YYYY-YY' });
    }

    const predictionsData = await predictGamesForDate(date, seasonParam);

    if (!predictionsData) {
      return res.status(404).json({ error: `No predictions available for date ${date}` });
    }

    // Validate response
    const { error } = predictionsResponseSchema.validate(predictionsData);
    if (error) {
     console.log('Predictions validation error:', error);
      return res.status(500).json({ error: 'Invalid predictions data' });
    }

    res.json(predictionsData);
  } catch (error) {
   console.log('Error fetching predictions:', error);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

export default router;