// server/src/middleware/mongoSanitizer.js

/**
 * Eliminates NoSQL Injection by recursively stripping keys starting with '$' or containing '.'
 */
function sanitizeMongoPayload(req, res, next) {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
}

module.exports = { sanitizeMongoPayload };
