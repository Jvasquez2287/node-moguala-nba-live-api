import express from 'express';
import * as winston from 'winston';
import { searchEntities } from '../services/search';
import { searchResultsSchema } from '../schemas/search';

const router = express.Router();

// Search for players and teams
router.get('/', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required and must be non-empty' });
    }

    if (query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters long' });
    }

    const searchData = await searchEntities(query.trim());

    if (!searchData) {
      return res.status(500).json({ error: 'Search service unavailable' });
    }

    // Validate response
    const { error } = searchResultsSchema.validate(searchData);
    if (error) {
     console.log('Search validation error:', error);
      return res.status(500).json({ error: 'Invalid search results' });
    }

    res.json(searchData);
  } catch (error) {
   console.log('Error performing search:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

export default router;