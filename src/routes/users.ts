import express, { Request, Response } from 'express';
import { clerkService } from '../services/clerk';
import { executeQuery } from '../config/database';
import userService from '../services/users';
import { tokenCheckService } from '../services/tokenCheck';

const router = express.Router();


router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[Users] Fetching users with subscription check' );
    const validationResult = await tokenCheckService.validateTokenAndCheckSubscription(req);
    if (!validationResult.valid) {
      return res.json({ success: false, error: 'Invalid or missing security parameters', requestQuery: req.query });
    }
     
    const user = await  userService.getUserByClerkIdWithSubscription(validationResult.user?.clerk_id || '');

    console.log('[Users] User fetched with subscription info:', user);

    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    return res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('[Users] Error fetching users:', error);
    res.json({ success: false, error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/v1/users/:clerkId
 * Get user by Clerk ID
 */
router.get('/:clerkId', async (req: Request, res: Response) => {
  try {
    const { clerkId } = req.params;

    if (!clerkId) {
      return res.status(400).json({ success: false, error: 'clerkId is required' });
    }

    const user = await clerkService.getUserByClerkId(clerkId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[Users] Error fetching user:', error);
    res.json({ success: false, error: 'Failed to fetch user' });
  }
});

/**
 * GET /api/v1/users/email/:email
 * Get user by email
 */
router.get('/email/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    const result = await executeQuery(
      'SELECT * FROM users WHERE email = @email',
      { email }
    );

    if (!result || result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('[Users] Error fetching user by email:', error);
    res.json({ success: false, error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/v1/users
 * Create a new user (from Clerk webhook usually)
 * Body: { clerkId, email, firstName, lastName, profileImage }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { clerkId, email, firstName, lastName, profileImage } = req.body;

    if (!clerkId || !email) {
      return res.status(400).json({ success: false, error: 'clerkId and email are required' });
    }

    const result = await executeQuery(
      `INSERT INTO users (clerk_id, email, first_name, last_name, profile_image, created_at)
       VALUES (@clerkId, @email, @firstName, @lastName, @profileImage, @now)`,
      {
        clerkId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        profileImage: profileImage || '',
        now: new Date()
      }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('[Users] Error creating user:', error);
    res.json({ success: false, error: 'Failed to create user' });
  }
});

/**
 * PUT /api/v1/users/:clerkId
 * Update user information
 */
router.put('/:clerkId', async (req: Request, res: Response) => {
  try {
    const { clerkId } = req.params;
    const { email, firstName, lastName, profileImage } = req.body;

    if (!clerkId) {
      return res.status(400).json({ success: false, error: 'clerkId is required' });
    }

    await executeQuery(
      `UPDATE users 
       SET email = @email, first_name = @firstName, last_name = @lastName, profile_image = @profileImage, updated_at = @now
       WHERE clerk_id = @clerkId`,
      {
        clerkId,
        email: email || null,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImage: profileImage || null,
        now: new Date()
      }
    );

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('[Users] Error updating user:', error);
    res.json({ success: false, error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/v1/users/:clerkId
 * Delete a user
 */
router.delete('/:clerkId', async (req: Request, res: Response) => {
  try {
    const { clerkId } = req.params;

    if (!clerkId) {
      return res.json({ success: false, error: 'clerkId is required' });
    }

    await executeQuery(
      'DELETE FROM users WHERE clerk_id = @clerkId',
      { clerkId }
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('[Users] Error deleting user:', error);
    res.json({ success: false, error: 'Failed to delete user' });
  }
});

export default router;
