// server/src/middleware/authMiddleware.js
const { verifyAccessToken } = require('../security/tokenManager');

/**
 * Validates JWT from HttpOnly Cookie or Bearer header
 */
function authenticateJwt(req, res, next) {
  let token = req.cookies?.accessToken;

  // Fallback to Bearer authorization header if cookie not present
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized. Authentication token is missing.'
    });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please log in again.'
    });
  }

  // Attach verified user context to request
  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    name: payload.name
  };

  next();
}

/**
 * Optional JWT authentication (attaches user if present, otherwise allows guest)
 */
function optionalAuthenticateJwt(req, res, next) {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name
      };
    }
  }

  next();
}

/**
 * Role-Based Access Control (RBAC) guard
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        error: 'Forbidden. You do not have permission to perform this action.'
      });
    }
    next();
  };
}

module.exports = {
  authenticateJwt,
  optionalAuthenticateJwt,
  requireRole
};
