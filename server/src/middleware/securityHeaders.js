// server/src/middleware/securityHeaders.js
let helmet;
try {
  helmet = require('helmet');
} catch (e) {
  // Built-in lightweight fallback if helmet is pending npm install
  helmet = () => (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.removeHeader('X-Powered-By');
    next();
  };
}

const securityHeaders = (typeof helmet === 'function' && helmet.contentSecurityPolicy) 
  ? helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Needed for inline scripts if any, ideally nonce-based
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com",
            "https://cdn.emailjs.com"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com"
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          connectSrc: ["'self'", "https://api.emailjs.com", "http://localhost:*", "http://127.0.0.1:*"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"], // Stops clickjacking
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
    })
  : helmet();

module.exports = { securityHeaders };
