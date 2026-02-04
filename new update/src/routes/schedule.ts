import express from 'express';
import * as winston from 'winston';
import { getGamesForDate } from '../services/schedule';
import { gamesResponseSchema } from '../schemas/schedule';
import { date } from 'joi';

const router = express.Router();
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// Get games for a specific date
router.get('/schedule/date/:date', async (req, res) => {
    try {
        const { date } = req.params;

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        const gamesData = await getGamesForDate(date);

        if (!gamesData) {
            return res.status(404).json({ error: `No games found for date ${date}` });
        }

        // Validate response
        const { error } = gamesResponseSchema.validate(gamesData);
        if (error) {
           console.log('Schedule validation error:', error);
            return res.status(500).json({ error: 'Invalid schedule data' });
        }

        res.json(gamesData);
    } catch (error) {
       console.log('Error fetching games for date:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

 

// Also support query parameter for backward compatibility
router.get('/schedule', async (req, res) => {
    try {
        const date = req.query.date as string;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        const gamesData = await getGamesForDate(date);

        if (!gamesData) {
            return res.status(404).json({ error: `No games found for date ${date}` });
        }

        // Validate response
        const { error } = gamesResponseSchema.validate(gamesData);
        if (error) {
           console.log('Schedule validation error:', error);
            return res.status(500).json({ error: 'Invalid schedule data' });
        }

        res.json(gamesData);
    } catch (error) {
       console.log('Error fetching games for date:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});


export default router;