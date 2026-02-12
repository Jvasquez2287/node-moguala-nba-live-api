"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const search_1 = require("../services/search");
const search_2 = require("../schemas/search");
const router = express_1.default.Router();
// GET /api/v1/search - Search for players, teams, etc
router.get('/search', async (req, res) => {
    try {
        const { q: query } = req.query;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.json({ error: 'Query parameter "q" is required and must be non-empty' });
        }
        if (query.length < 2) {
            return res.json({ error: 'Query must be at least 2 characters long',
                example: '/api/v1/search?q=LeBron or /api/v1/search?q=Lakers'
            });
        }
        const searchData = await (0, search_1.searchEntities)(query.trim());
        if (!searchData) {
            return res.json({ error: 'Search service unavailable' });
        }
        // Validate response
        const { error } = search_2.searchResultsSchema.validate(searchData);
        if (error) {
            console.log('Search validation error:', error);
            return res.json({ error: 'Invalid search results' });
        }
        res.json(searchData);
    }
    catch (error) {
        console.log('Error performing search:', error);
        res.json({ error: 'Failed to perform search' });
    }
});
exports.default = router;
//# sourceMappingURL=search.js.map