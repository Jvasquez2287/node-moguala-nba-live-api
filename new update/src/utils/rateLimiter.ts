/**
 * Rate limiter utility for API requests.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) { // 100 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(key: string): number {
    const entry = this.requests.get(key);
    if (!entry) return this.maxRequests;

    const now = Date.now();
    if (now > entry.resetTime) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(key: string): number {
    const entry = this.requests.get(key);
    return entry ? entry.resetTime : Date.now() + this.windowMs;
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

/**
 * Rate limit middleware for Express.
 */
export function rateLimitMiddleware(req: any, res: any, next: any) {
  const key = req.ip || req.connection.remoteAddress || 'unknown';

  if (!rateLimiter.isAllowed(key)) {
    const resetTime = rateLimiter.getResetTime(key);
    const remaining = rateLimiter.getRemainingRequests(key);

    res.set({
      'X-RateLimit-Limit': rateLimiter['maxRequests'],
      'X-RateLimit-Remaining': remaining,
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000),
      'Retry-After': Math.ceil((resetTime - Date.now()) / 1000)
    });

    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }

  next();
}