import { Webhook } from 'svix';
import { Request } from 'express';
import { executeQuery } from '../config/database';
import stripeService from './stripe';


const clerkWebhookSecret = (): string => {
  console.log('Determining Clerk webhook secret...', `NODE_ENV: ${process.env.NODE_ENV}`);

  // Priority: env var > development default
  let secret: string | undefined;

  if (process.env.NODE_ENV && process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    secret = 'whsec_YwRdaveVDGVih3Zr1wkjyXiWIWnYle2T';
    console.log('Using development Clerk webhook secret', secret.slice(0, 10) + '...'); // Log only part of the secret for security
  } else {
    secret = process.env.CLERK_WEBHOOK_SECRET;
    console.log('Using production Clerk webhook secret from environment variable:', secret?.slice(0, 10) + '...'); // Log only part of the secret for security
  }

  if (!secret) {
    throw new Error('CLERK_WEBHOOK_SECRET environment variable is not set and NODE_ENV is not development');
  }

  return secret;
}

/**
 * Get Clerk API Secret Key for making API calls to Clerk
 * This is different from the webhook secret - it's used for authenticating API requests
 */
const getClerkAPISecret = (): string => {
  const apiSecret = process.env.CLERK_SECRET_KEY;

  if (!apiSecret) {
    const errorMsg = 'CLERK_SECRET_KEY environment variable is not set. Required for making API calls to Clerk.';
    console.error(`[Clerk] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Log which secret is being used (masked for security)
  const secretMasked = apiSecret.substring(0, 10) + '***' + apiSecret.substring(apiSecret.length - 5);
  console.log(`[Clerk] Using API secret: ${secretMasked}`);

  return apiSecret;
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name?: string;
  last_name?: string;
  created_at: number;
  updated_at: number;
  profile_image_url?: string; // Maps to profile_image in DB
}

interface WebhookEvent {
  data: ClerkUser;
  object: string;
  type: string;
}

let syncInterval: NodeJS.Timeout | null = null;

export const clerkService = {
  /**
   * Verify and process Clerk webhook
   */
  async verifyWebhook(req: Request): Promise<WebhookEvent | null> {
    try {
      const wh = new Webhook(clerkWebhookSecret());

      // Get raw body - Clerk's Svix library requires the raw body for signature verification
      let rawBody: string;

      if (Buffer.isBuffer(req.body)) {
        // If it's a Buffer (from express.raw middleware), convert to string
        rawBody = req.body.toString('utf-8');
        console.log(`[Clerk] Raw body received as Buffer (${req.body.length} bytes)`);
      } else if (typeof req.body === 'string') {
        // If it's already a string, use it directly
        rawBody = req.body;
        console.log(`[Clerk] Raw body received as string (${req.body.length} characters)`);
      } else {
        // If it's an object (shouldn't happen with raw body parser), we can't recover the original body
        // for signature verification. Log this as an error.
        console.error('[Clerk] ERROR: req.body is an object, not raw! Signature verification will fail.');
        console.log('[Clerk] Body type:', typeof req.body);
        console.log('[Clerk] Make sure Clerk webhook endpoint has express.raw({type: "application/json"}) middleware');
        throw new Error('Clerk webhook: req.body must be Buffer or string for signature verification. Make sure raw body parser middleware is applied.');
      }

      // Log headers for debugging
      const svixId = req.headers['svix-id'];
      const svixSignature = req.headers['svix-signature'];
      const svixTimestamp = req.headers['svix-timestamp'];

      console.log('[Clerk] Webhook headers:');
      console.log('  - svix-id:', svixId ? `${String(svixId).substring(0, 10)}...` : 'missing');
      console.log('  - svix-signature (first 30 chars):', svixSignature ? String(svixSignature).substring(0, 30) + '...' : 'missing');
      console.log('  - svix-timestamp:', svixTimestamp);

      // Verify the webhook signature
      const msg = wh.verify(rawBody, req.headers as any);

      console.log('[Clerk] Webhook verified successfully');
      return msg as unknown as WebhookEvent;
    } catch (error) {
      console.error('[Clerk] Webhook verification failed:', error);
      if (error instanceof Error) {
        console.error('[Clerk] Error message:', error.message);
        console.error('[Clerk] Error stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
      }
      throw error;
    }
  },

  /**
   * Handle user created event
   */
  async handleUserCreated(clerkUser: ClerkUser) {
    try {
      const email = clerkUser.email_addresses?.[0]?.email_address;
      if (!email) {
        throw new Error('No email found for user');
      }

      // Get or create Stripe customer
      const fullName = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim();
      const stripeCustomer = await stripeService.getOrCreateCustomer(email, fullName);

      const query = `
        INSERT INTO users (clerk_id, email, first_name, last_name, profile_image, stripe_id, created_at)
        VALUES (@clerkId, @email, @firstName, @lastName, @profileImage, @stripeId, @createdAt)
      `;

      const result = await executeQuery(query, {
        clerkId: clerkUser.id,
        email: email,
        firstName: clerkUser.first_name || null,
        lastName: clerkUser.last_name || null,
        profileImage: clerkUser.profile_image_url || `https://www.gravatar.com/avatar/${email}?d=identicon`,
        stripeId: stripeCustomer.id,
        createdAt: new Date(clerkUser.created_at)
      });

      console.log(`[Clerk] User created: ${email} with Stripe customer: ${stripeCustomer.id}`);
      return result;
    } catch (error) {
      console.error('[Clerk] Error handling user created:', error);
      throw error;
    }
  },

  /**
   * Handle user updated event
   */
  async handleUserUpdated(clerkUser: ClerkUser) {
    try {
      const email = clerkUser.email_addresses?.[0]?.email_address;
      if (!email) {
        throw new Error('No email found for user');
      }

      // Get or create Stripe customer
      const fullName = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim();
      const stripeCustomer = await stripeService.getOrCreateCustomer(email, fullName);

      const query = `
        UPDATE users 
        SET email = @email, first_name = @firstName, last_name = @lastName, 
            profile_image = @profileImage, stripe_id = @stripeId, updated_at = @updatedAt
        WHERE clerk_id = @clerkId
      `;

      const result = await executeQuery(query, {
        clerkId: clerkUser.id,
        email: email,
        firstName: clerkUser.first_name || null,
        lastName: clerkUser.last_name || null,
        profileImage: clerkUser.profile_image_url || `https://avatars.dicebear.com/api/initials/${encodeURIComponent(email)}.svg?background=%23ffffff&color=%23000000`,
        stripeId: stripeCustomer.id,
        updatedAt: new Date(clerkUser.updated_at)
      });

      //console.log(`[Clerk] User updated: ${email} (Stripe: ${stripeCustomer.id})`);
      return result;
    } catch (error) {
      console.error('[Clerk] Error handling user updated:', error);
      throw error;
    }
  },

  /**
   * Handle user deleted event
   */
  async handleUserDeleted(clerkUserId: string) {
    try {
      const query = 'UPDATE users SET deleted_at = @now WHERE clerk_id = @clerkId';

      const result = await executeQuery(query, {
        clerkId: clerkUserId,
        now: new Date()
      });

      console.log(`[Clerk] User deleted: ${clerkUserId}`);
      return result;
    } catch (error) {
      console.error('[Clerk] Error handling user deleted:', error);
      throw error;
    }
  },

  /**
   * Get user from database by Clerk ID
   */
  async getUserByClerkId(clerkId: string) {
    try {
      const result = await executeQuery(
        'SELECT * FROM users WHERE clerk_id = @clerkId',
        { clerkId },
      );
      return result.recordset?.[0] || null;
    } catch (error) {
      console.error('[Clerk] Error getting user:', error);
      throw error;
    }
  },

  /**
   * Get user from database by email
   */
  async getUserByEmail(email: string) {
    try {
      const result = await executeQuery(
        'SELECT * FROM users WHERE email = @email',
        { email }
      );
      return result.recordset?.[0] || null;
    } catch (error) {
      console.error('[Clerk] Error getting user by email:', error);
      throw error;
    }
  },

  /**
   * Get user's clerk ID by email
   */
  async getClerkIdByEmail(email: string): Promise<string | null> {
    try {
      const user = await this.getUserByEmail(email);
      return user?.clerk_id || null;
    } catch (error) {
      console.error('[Clerk] Error getting clerk ID by email:', error);
      throw error;
    }
  },

  /**
   * Handle session created event
   */
  async handleSessionCreated(sessionData: any) {
    try {
      const userId = sessionData.user_id;
      const sessionId = sessionData.id;

      if (!userId) {
        throw new Error('No user_id found in session data');
      }

      // Get the user from database by clerk_id
      let user = await this.getUserByClerkId(userId);

      // If user not found, fetch from Clerk API and create in DB
      if (!user) {
        console.log(`[Clerk] User not found for clerk_id: ${userId}, fetching from Clerk API...`);
        const clerkUser = await this.getUserFromClerkAPIById(userId);
        if (clerkUser) {
          await this.handleUserCreated(clerkUser);
          user = await this.getUserByClerkId(userId);
          console.log(`[Clerk] User synced from Clerk API and saved to database for clerk_id: ${userId}`);
        } else {
          console.warn(`[Clerk] User not found in Clerk API for clerk_id: ${userId}`);
          return null;
        }
      }

      // Ensure user has a Stripe ID (for existing users created before Stripe integration)
      if (!user.stripe_id) {
        try {
          console.log(`[Stripe] User missing stripe_id, creating/linking Stripe customer...`);
          // Get or create Stripe customer
          const stripeCustomer = await stripeService.getOrCreateCustomer(user.email, `${user.first_name || ''} ${user.last_name || ''}`.trim());

          // Update user with stripe_id
          const updateQuery = `
            UPDATE users SET stripe_id = @stripeId, updated_at = @updatedAt
            WHERE clerk_id = @clerkId
          `;

          await executeQuery(updateQuery, {
            clerkId: userId,
            stripeId: stripeCustomer.id,
            updatedAt: new Date()
          });

          user.stripe_id = stripeCustomer.id;
          console.log(`[Stripe] User linked to Stripe customer: ${stripeCustomer.id}`);
        } catch (error) {
          console.error(`[Stripe] Error creating/linking Stripe customer on session:`, error);
        }
      }

      // Check subscription status from Stripe
      if (user.stripe_id) {
        try {
          console.log(`[Stripe] Checking subscriptions for customer: ${user.stripe_id}`);
          const subscriptions = await stripeService.getCustomerSubscriptions(user.stripe_id);

          if (subscriptions.length > 0) {
            console.log(`[Stripe] Found ${subscriptions.length} subscription(s) for customer ${user.stripe_id}`);

            // Sync each subscription to database
            for (const subscription of subscriptions) {
              try {
                const sub = subscription as any;
                const productId = sub.items?.data?.[0]?.plan?.product;
                if (!productId) {
                  console.warn('[Stripe] Subscription has no product ID, skipping');
                  continue;
                }

                const productData = await stripeService.getProductsByID(productId);
                const subscriptionData = {
                  stripe_id: sub.customer as string || '',
                  subscription_id: sub.id,
                  subscription_start_date: new Date((sub.current_period_start || 0) * 1000),
                  subscription_end_date: new Date((sub.current_period_end || 0) * 1000),
                  subscription_status: sub.status,
                  subscription_title: (productData as any).name || 'Unknown',
                  subscription_next_billing_date: new Date((sub.current_period_end || 0) * 1000),
                  subscription_latest_invoice_Id: (sub.latest_invoice as string) || '',
                  subscription_invoice_pdf_url: await stripeService.getInvoice(sub.latest_invoice as string) || '',
                  subscription_canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
                  subscription_cancel_at_period_end: sub.cancel_at_period_end || false,
                  product_id: productId || ''
                };

                const existingSubscription = await stripeService.getSubscriptionFromDB(sub.customer as string);
                if (existingSubscription) {
                  await stripeService.updateSubscriptionInDB(sub.customer as string, subscriptionData);
                  console.log(`[Stripe] Updated subscription: ${sub.id}`);
                } else {
                  await stripeService.createSubscriptionInDB(subscriptionData);
                  console.log(`[Stripe] Created subscription: ${sub.id}`);
                }
              } catch (error) {
                console.error(`[Stripe] Error syncing subscription:`, error);
              }
            }
          } else {
            console.log(`[Stripe] No subscriptions found for customer ${user.stripe_id}`);
          }
        } catch (error) {
          console.error(`[Stripe] Error checking subscriptions for session:`, error);
        }
      }

      const query = `
        INSERT INTO user_session_infos (user_id, session_token, expires_at, created_at)
        VALUES (@userId, @sessionToken, @expiresAt, @createdAt)
      `;

      const result = await executeQuery(query, {
        userId: user.id,
        sessionToken: sessionId,
        expiresAt: sessionData.expire_at ? new Date(sessionData.expire_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        createdAt: new Date()
      });

      console.log(`[Clerk] Session created for user: ${userId}`);
      return result;
    } catch (error) {
      console.error('[Clerk] Error handling session created:', error);
      throw error;
    }
  },

  /**
   * Handle session ended event
   */
  async handleSessionEnded(sessionData: any) {
    try {
      const userId = sessionData.user_id;
      const sessionId = sessionData.id;

      if (!userId) {
        throw new Error('No user_id found in session data');
      }

      // Get the user from database by clerk_id
      let user = await this.getUserByClerkId(userId);

      // If user not found, fetch from Clerk API and create in DB
      if (!user) {
        console.log(`[Clerk] User not found for clerk_id: ${userId}, fetching from Clerk API...`);
        const clerkUser = await this.getUserFromClerkAPIById(userId);
        if (clerkUser) {
          await this.handleUserCreated(clerkUser);
          user = await this.getUserByClerkId(userId);
          console.log(`[Clerk] User synced from Clerk API and saved to database for clerk_id: ${userId}`);
        } else {
          console.warn(`[Clerk] User not found in Clerk API for clerk_id: ${userId}`);
          return null;
        }
      }

      // Ensure user has a Stripe ID (for existing users created before Stripe integration)
      if (!user.stripe_id) {
        try {
          console.log(`[Stripe] User missing stripe_id, creating/linking Stripe customer...`);
          // Get or create Stripe customer
          const stripeCustomer = await stripeService.getOrCreateCustomer(user.email, `${user.first_name || ''} ${user.last_name || ''}`.trim());

          // Update user with stripe_id
          const updateQuery = `
            UPDATE users SET stripe_id = @stripeId, updated_at = @updatedAt
            WHERE clerk_id = @clerkId
          `;

          await executeQuery(updateQuery, {
            clerkId: userId,
            stripeId: stripeCustomer.id,
            updatedAt: new Date()
          });

          user.stripe_id = stripeCustomer.id;
          console.log(`[Stripe] User linked to Stripe customer: ${stripeCustomer.id}`);
        } catch (error) {
          console.error(`[Stripe] Error creating/linking Stripe customer on session end:`, error);
        }
      }

      const query = `
        DELETE FROM user_session_infos 
        WHERE user_id = @userId AND session_token = @sessionToken
      `;

      const result = await executeQuery(query, {
        userId: user.id,
        sessionToken: sessionId
      });

      console.log(`[Clerk] Session ended for user: ${userId}`);
      return result;
    } catch (error) {
      console.error('[Clerk] Error handling session ended:', error);
      throw error;
    }
  },

  /**
   * Handle session renewed event
   */
  async handleSessionRenewed(sessionData: any) {
    try {
      const userId = sessionData.user_id;
      const sessionId = sessionData.id;

      if (!userId) {
        throw new Error('No user_id found in session data');
      }

      // Get the user from database by clerk_id
      let user = await this.getUserByClerkId(userId);

      // If user not found, fetch from Clerk API and create in DB
      if (!user) {
        console.log(`[Clerk] User not found for clerk_id: ${userId}, fetching from Clerk API...`);
        const clerkUser = await this.getUserFromClerkAPIById(userId);
        if (clerkUser) {
          await this.handleUserCreated(clerkUser);
          user = await this.getUserByClerkId(userId);
          console.log(`[Clerk] User synced from Clerk API and saved to database for clerk_id: ${userId}`);
        } else {
          console.warn(`[Clerk] User not found in Clerk API for clerk_id: ${userId}`);
          return null;
        }
      }

      // Ensure user has a Stripe ID (for existing users created before Stripe integration)
      if (!user.stripe_id) {
        try {
          console.log(`[Stripe] User missing stripe_id, creating/linking Stripe customer...`);
          // Get or create Stripe customer
          const stripeCustomer = await stripeService.getOrCreateCustomer(user.email, `${user.first_name || ''} ${user.last_name || ''}`.trim());

          // Update user with stripe_id
          const updateQuery = `
            UPDATE users SET stripe_id = @stripeId, updated_at = @updatedAt
            WHERE clerk_id = @clerkId
          `;

          await executeQuery(updateQuery, {
            clerkId: userId,
            stripeId: stripeCustomer.id,
            updatedAt: new Date()
          });

          user.stripe_id = stripeCustomer.id;
          console.log(`[Stripe] User linked to Stripe customer: ${stripeCustomer.id}`);
        } catch (error) {
          console.error(`[Stripe] Error creating/linking Stripe customer on session renewal:`, error);
        }
      }

      // Check subscription status from Stripe
      if (user.stripe_id) {
        try {
          console.log(`[Stripe] Checking subscriptions for customer: ${user.stripe_id}`);
          const subscriptions = await stripeService.getCustomerSubscriptions(user.stripe_id);

          if (subscriptions.length > 0) {
            console.log(`[Stripe] Found ${subscriptions.length} subscription(s) for customer ${user.stripe_id}`);

            // Sync each subscription to database
            for (const subscription of subscriptions) {
              try {
                const sub = subscription as any;
                const productId = sub.items?.data?.[0]?.plan?.product;
                if (!productId) {
                  console.warn('[Stripe] Subscription has no product ID, skipping');
                  continue;
                }

                const productData = await stripeService.getProductsByID(productId);
                const subscriptionData = {
                  stripe_id: sub.customer as string || '',
                  subscription_id: sub.id,
                  subscription_start_date: new Date((sub.current_period_start || 0) * 1000),
                  subscription_end_date: new Date((sub.current_period_end || 0) * 1000),
                  subscription_status: sub.status,
                  subscription_title: (productData as any).name || 'Unknown',
                  subscription_next_billing_date: new Date((sub.current_period_end || 0) * 1000),
                  subscription_latest_invoice_Id: (sub.latest_invoice as string) || '',
                  subscription_invoice_pdf_url: await stripeService.getInvoice(sub.latest_invoice as string) || '',
                  subscription_canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
                  subscription_cancel_at_period_end: sub.cancel_at_period_end || false,
                  product_id: productId || ''
                };

                const existingSubscription = await stripeService.getSubscriptionFromDB(sub.customer as string);
                if (existingSubscription) {
                  await stripeService.updateSubscriptionInDB(sub.customer as string, subscriptionData);
                  console.log(`[Stripe] Updated subscription: ${sub.id}`);
                } else {
                  await stripeService.createSubscriptionInDB(subscriptionData);
                  console.log(`[Stripe] Created subscription: ${sub.id}`);
                }
              } catch (error) {
                console.error(`[Stripe] Error syncing subscription:`, error);
              }
            }
          } else {
            console.log(`[Stripe] No subscriptions found for customer ${user.stripe_id}`);
          }
        } catch (error) {
          console.error(`[Stripe] Error checking subscriptions for session renewal:`, error);
        }
      }

      const query = `
        UPDATE user_session_infos 
        SET expires_at = @expiresAt
        WHERE user_id = @userId AND session_token = @sessionToken
      `;

      const result = await executeQuery(query, {
        userId: user.id,
        sessionToken: sessionId,
        expiresAt: sessionData.expire_at ? new Date(sessionData.expire_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      console.log(`[Clerk] Session renewed for user: ${userId}`);
      return result;
    } catch (error) {
      console.error('[Clerk] Error handling session renewed:', error);
      throw error;
    }
  },

  /**
   * Get user from Clerk API by email
   */
  async getUserFromClerkAPI(email: string) {
    try {
      const user = await fetch(`https://api.clerk.dev/v1/users?email_address=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${getClerkAPISecret()}`,
          'Content-Type': 'application/json'
        }
      }).then(res => res.json());

      return user || null;
    } catch (error) {
      console.error('[Clerk] Error fetching user from Clerk API:', error);
      throw error;
    }
  },

  /**
   * Get user from Clerk API by clerk ID
   */
  async getUserFromClerkAPIById(clerkId: string): Promise<ClerkUser | null> {
    try {
      const response = await fetch(`https://api.clerk.dev/v1/users/${clerkId}`, {
        headers: {
          'Authorization': `Bearer ${getClerkAPISecret()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`[Clerk] Failed to fetch user ${clerkId} from Clerk API:`, response.status);
        return null;
      }

      const user = await response.json() as any;
      return (user as ClerkUser) || null;
    } catch (error) {
      console.error('[Clerk] Error fetching user from Clerk API by ID:', error);
      throw error;
    }
  },

  /**
   * Sync all users from Clerk API to database
   */
  async syncAllUsersFromClerk(): Promise<{ created: number; updated: number; failed: number }> {
    try {
      console.log('[Clerk] Starting full user sync from Clerk API...');
      console.log('[Clerk] Using CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'Set' : 'Not set');

      let createdCount = 0;
      let updatedCount = 0;
      let failedCount = 0;
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      let totalUsers = 0;

      while (hasMore) {
        try {
          const url = `https://api.clerk.dev/v1/users?offset=${offset}&limit=${limit}`;
          console.log(`[Clerk] Fetching users from: ${url}`);

          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${getClerkAPISecret()}`,
              'Content-Type': 'application/json'
            }
          });

          console.log(`[Clerk] API response status: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Clerk] Failed to fetch users from Clerk API: ${response.status}`, errorText);
            break;
          }

          const data = await response.json() as any;
          console.log(`[Clerk] API response data structure:`, JSON.stringify(data).substring(0, 500));

          // Handle both array response and wrapped response
          const users = (Array.isArray(data) ? data : data?.data || []) as ClerkUser[];
          console.log(`[Clerk] Parsed ${users.length} users from API`);
          totalUsers += users.length;

          if (users.length === 0) {
            hasMore = false;
            break;
          }

          for (const clerkUser of users) {
            try {
              const existingUser = await this.getUserByClerkId(clerkUser.id);

              if (existingUser) {
                // Update existing user
                await this.handleUserUpdated(clerkUser);
                updatedCount++;
              } else {
                // Create new user
                await this.handleUserCreated(clerkUser);
                createdCount++;
              }
            } catch (error) {
              console.error(`[Clerk] Error syncing user ${clerkUser.id}:`, error);
              failedCount++;
            }
          }

          offset += limit;
        } catch (error) {
          console.error('[Clerk] Error during pagination:', error);
          break;
        }
      }

      const summary = {
        created: createdCount,
        updated: updatedCount,
        failed: failedCount,
        Total: totalUsers
      };

      console.log('[Clerk] Full user sync completed:', summary);
      return summary;
    } catch (error) {
      console.error('[Clerk] Error syncing all users:', error);
      throw error;
    }
  },

  async getSubscriptionStatus(clerkId: string) {
    try {
      const user = await this.getUserByClerkId(clerkId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.stripe_id) {
        throw new Error('User has no associated Stripe customer');
      }
      const subscriptions = await stripeService.getCustomerSubscriptions(user.stripe_id);
      if (subscriptions.length === 0) {
        return 'no_subscription';
      }
      const activeSubscription = subscriptions.find(sub => sub.status === 'active');
      return activeSubscription ? 'active' : 'inactive';
    }
    catch (error) {
      console.error('[Clerk] Error getting subscription status:', error);
      throw error;
    }
  },

  /**
   * Start automatic user sync every 24 hours
   */
  startAutoSync() {
    if (syncInterval) {
      console.log('[Clerk] Auto sync already running');
      return;
    }

    console.log('[Clerk] Starting automatic user sync (every 24 hours)');

    // Sync immediately on startup
    this.syncAllUsersFromClerk().catch(error => {
      console.error('[Clerk] Error during initial sync:', error);
    });

    // Then set up the interval (24 hours = 86400000 ms)
    syncInterval = setInterval(async () => {
      try {
        console.log('[Clerk] Running scheduled user sync...');
        await this.syncAllUsersFromClerk();
      } catch (error) {
        console.error('[Clerk] Error during scheduled sync:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('[Clerk] Auto sync started - will run every 24 hours');
  },

  /**
   * Stop automatic user sync
   */
  stopAutoSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
      console.log('[Clerk] Auto sync stopped');
    }
  }
};

export default clerkService;
