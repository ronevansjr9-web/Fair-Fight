// Simple in-memory rate limiter
// In production, use Redis or a database-backed rate limiter

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  ai: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 AI requests per hour
  general: { max: 100, windowMs: 60 * 60 * 1000 }, // 100 general requests per hour
  auth: { max: 20, windowMs: 15 * 60 * 1000 }, // 20 auth requests per 15 min
  stripe: { max: 10, windowMs: 60 * 60 * 1000 },
};

export async function checkRateLimit(
  category: string,
  identifier = "global"
): Promise<{ error: string; status: number } | null> {
  const key = `${category}:${identifier}`;
  const limit = LIMITS[category] || LIMITS.general;
  const now = Date.now();

  let entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    rateLimitMap.set(key, entry);
  }

  entry.count++;

  if (entry.count > limit.max) {
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      error: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
      status: 429,
    };
  }

  return null;
}

export function getRateLimitHeaders(category: string, identifier = "global"): Record<string, string> {
  const key = `${category}:${identifier}`;
  const limit = LIMITS[category] || LIMITS.general;
  const entry = rateLimitMap.get(key);

  return {
    "X-RateLimit-Limit": String(limit.max),
    "X-RateLimit-Remaining": String(entry ? Math.max(0, limit.max - entry.count) : limit.max),
    "X-RateLimit-Reset": String(entry ? Math.ceil(entry.resetAt / 1000) : Math.ceil((Date.now() + limit.windowMs) / 1000)),
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
