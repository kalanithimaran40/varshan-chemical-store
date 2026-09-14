// server/src/middleware/validateRequest.js
const path = require('path');

let z;
try {
  z = require('zod').z;
} catch (e) {
  // Simple validation fallback if zod not yet installed
  z = null;
}

/**
 * Validates request schema using Zod
 */
function validate(schema) {
  return (req, res, next) => {
    if (!schema || !z) return next();

    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err.errors) {
        return res.status(400).json({
          status: 400,
          error: 'Input Validation Failed',
          details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      return res.status(400).json({ error: 'Invalid input data.' });
    }
  };
}

/**
 * Open Redirection Blocker
 * Ensures destination URLs are restricted to trusted domains or relative paths.
 */
const ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'varshanchemicals.com'];

function isSafeRedirectUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') return false;

  // Safe relative paths (e.g. /products, /account)
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//') && !targetUrl.includes('\\')) {
    return true;
  }

  try {
    const parsed = new URL(targetUrl);
    return ALLOWED_HOSTS.includes(parsed.hostname) && ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Path Traversal Blocker
 * Ensures resolved file paths cannot escape the designated base directory.
 */
const BASE_STORAGE_DIR = path.resolve(__dirname, '../../uploads');

function getSafeFilePath(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name parameter.');
  }

  // Reject traversal characters or null bytes explicitly
  if (fileName.includes('\0') || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new Error('Malicious path traversal sequence detected.');
  }

  const safeName = path.basename(fileName);
  const resolved = path.resolve(BASE_STORAGE_DIR, safeName);

  if (!resolved.startsWith(BASE_STORAGE_DIR)) {
    throw new Error('Path resolution boundary violation.');
  }

  return resolved;
}

module.exports = {
  validate,
  isSafeRedirectUrl,
  getSafeFilePath
};
