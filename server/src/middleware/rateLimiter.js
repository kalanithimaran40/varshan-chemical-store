// server/src/middleware/rateLimiter.js
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  // Fallback in-memory rate limiter if package is not installed yet
  rateLimit = (options) => {
    const hits = new Map();
    const windowMs = options.windowMs || 60000;
    const max = options.max || 100;
    
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
      const now = Date.now();
      const clientData = hits.get(ip) || { count: 0, resetTime: now + windowMs };

      if (now > clientData.resetTime) {
        clientData.count = 1;
        clientData.resetTime = now + windowMs;
      } else {
        clientData.count++;
      }

      hits.set(ip, clientData);

      if (clientData.count > max) {
        return res.status(429).json(options.message || { error: 'Too many requests. Please slow down.' });
      }
      next();
    };
  };
}

/**
 * Strict Rate Limiter for Authentication & Sensitive Endpoints
 * (Max 5 attempts per 15 minutes to block brute-force / credential stuffing)
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many login/OTP attempts. Please try again after 15 minutes.'
  }
});

/**
 * OTP Dispatch Limiter (Max 3 requests per 10 minutes)
 */
const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many OTP requests. Please wait before requesting another code.'
  }
});

/**
 * General API Limiter (Max 120 requests per minute)
 */
const generalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many requests. Please slow down.'
  }
});

module.exports = {
  authRateLimiter,
  otpRateLimiter,
  generalApiLimiter
};
