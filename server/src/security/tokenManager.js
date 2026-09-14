// server/src/security/tokenManager.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'varshan_default_access_secret_1234567890_dev';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'varshan_default_refresh_secret_1234567890_dev';

/**
 * Generate short-lived Access Token (15 minutes)
 */
function generateAccessToken(user) {
  return jwt.sign(
    { 
      sub: user.id,
      email: user.email,
      name: user.name || 'Customer',
      role: user.role || 'customer'
    },
    ACCESS_TOKEN_SECRET,
    { 
      expiresIn: '15m',
      algorithm: 'HS256',
      issuer: 'varshan-chemical-auth',
      audience: 'varshan-chemical-client'
    }
  );
}

/**
 * Generate long-lived Refresh Token (7 days)
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { 
      sub: user.id,
      jti: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
    },
    REFRESH_TOKEN_SECRET,
    { 
      expiresIn: '7d',
      algorithm: 'HS256',
      issuer: 'varshan-chemical-auth',
      audience: 'varshan-chemical-client'
    }
  );
}

/**
 * Verify Access Token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, {
      issuer: 'varshan-chemical-auth',
      audience: 'varshan-chemical-client'
    });
  } catch (error) {
    return null;
  }
}

/**
 * Verify Refresh Token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'varshan-chemical-auth',
      audience: 'varshan-chemical-client'
    });
  } catch (error) {
    return null;
  }
}

/**
 * Production Cookie Configuration
 * - httpOnly: Blocks document.cookie theft via XSS
 * - secure: Enforces HTTPS transmission
 * - sameSite: 'strict' blocks CSRF requests
 */
const COOKIE_SECURITY_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/',
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  COOKIE_SECURITY_OPTIONS,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET
};
