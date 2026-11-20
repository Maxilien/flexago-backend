// middleware/rateLimit.js
// ------------------------------------------------------
// Small in-memory rate limiter. Limits are per server
// instance, which matches the single Render web service.
// ------------------------------------------------------

function rateLimit({ windowMs, max, keyFn, message }) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);

  sweep.unref();

  return function rateLimitMiddleware(req, res, next) {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));

      return res.status(429).json({
        success: false,
        error: message || "Too many attempts. Please try again later."
      });
    }

    return next();
  };
}

module.exports = rateLimit;
