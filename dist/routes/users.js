"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clerk_1 = require("../services/clerk");
const database_1 = require("../config/database");
const users_1 = __importDefault(require("../services/users"));
const tokenCheck_1 = require("../services/tokenCheck");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        console.log('[Users] Fetching users with subscription check');
        const validationResult = await tokenCheck_1.tokenCheckService.validateTokenAndCheckSubscription(req);
        if (!validationResult.valid) {
            return res.json({ success: false, error: 'Invalid or missing security parameters' });
        }
        const user = await users_1.default.getUserByClerkIdWithSubscription(validationResult.user?.clerk_id || '');
        console.log('[Users] User fetched with subscription info:', user?.clerk_id);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }
        return res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('[Users] Error fetching users:', error);
        return res.json({ success: false, error: 'Failed to fetch users' });
    }
});
/**
 * GET /api/v1/users/:clerkId
 * Get user by Clerk ID
 */
router.get('/:clerkId', async (req, res) => {
    try {
        const { clerkId } = req.params;
        if (!clerkId) {
            return res.status(400).json({ success: false, error: 'clerkId is required' });
        }
        const user = await clerk_1.clerkService.getUserByClerkId(clerkId);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }
        return res.json({
            success: true,
            data: user
        });
    }
    catch (error) {
        console.error('[Users] Error fetching user:', error);
        return res.json({ success: false, error: 'Failed to fetch user' });
    }
});
/**
 * GET /api/v1/users/email/:email
 * Get user by email
 */
router.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) {
            return res.status(400).json({ success: false, error: 'email is required' });
        }
        const result = await (0, database_1.executeQuery)('SELECT * FROM users WHERE email = @email', { email });
        if (!result || result.recordset.length === 0) {
            return res.json({ success: false, error: 'User not found' });
        }
        return res.json({
            success: true,
            data: result.recordset[0]
        });
    }
    catch (error) {
        console.error('[Users] Error fetching user by email:', error);
        return res.json({ success: false, error: 'Failed to fetch user' });
    }
});
/**
 * POST /api/v1/users
 * Create a new user (from Clerk webhook usually)
 * Body: { clerkId, email, firstName, lastName, profileImage }
 */
router.post('/', async (req, res) => {
    try {
        const { clerkId, email, firstName, lastName, profileImage } = req.body;
        if (!clerkId || !email) {
            return res.status(400).json({ success: false, error: 'clerkId and email are required' });
        }
        const result = await (0, database_1.executeQuery)(`INSERT INTO users (clerk_id, email, first_name, last_name, profile_image, created_at)
       VALUES (@clerkId, @email, @firstName, @lastName, @profileImage, @now)`, {
            clerkId,
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            profileImage: profileImage || '',
            now: new Date()
        });
        res.status(201).json({
            success: true,
            message: 'User created successfully'
        });
    }
    catch (error) {
        console.error('[Users] Error creating user:', error);
        return res.json({ success: false, error: 'Failed to create user' });
    }
});
/**
 * PUT /api/v1/users/:clerkId
 * Update user information
 */
router.put('/:clerkId', async (req, res) => {
    try {
        const { clerkId } = req.params;
        const { email, firstName, lastName, profileImage } = req.body;
        if (!clerkId) {
            return res.status(400).json({ success: false, error: 'clerkId is required' });
        }
        await (0, database_1.executeQuery)(`UPDATE users 
       SET email = @email, first_name = @firstName, last_name = @lastName, profile_image = @profileImage, updated_at = @now
       WHERE clerk_id = @clerkId`, {
            clerkId,
            email: email || null,
            firstName: firstName || null,
            lastName: lastName || null,
            profileImage: profileImage || null,
            now: new Date()
        });
        return res.json({
            success: true,
            message: 'User updated successfully'
        });
    }
    catch (error) {
        console.error('[Users] Error updating user:', error);
        return res.json({ success: false, error: 'Failed to update user' });
    }
});
/**
 * DELETE /api/v1/users/:clerkId
 * Delete a user
 */
router.delete('/:clerkId', async (req, res) => {
    try {
        const { clerkId } = req.params;
        if (!clerkId) {
            return res.json({ success: false, error: 'clerkId is required' });
        }
        await (0, database_1.executeQuery)('DELETE FROM users WHERE clerk_id = @clerkId', { clerkId });
        return res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('[Users] Error deleting user:', error);
        return res.json({ success: false, error: 'Failed to delete user' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map