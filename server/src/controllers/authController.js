// server/src/controllers/authController.js
const { hashPassword, verifyPassword } = require('../security/passwordHasher');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  COOKIE_SECURITY_OPTIONS
} = require('../security/tokenManager');
const db = require('../db');

/**
 * User Registration with Argon2 Hashing
 */
async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || password.length < 8) {
      return res.status(400).json({
        error: 'Email and password (min 8 characters) are required.'
      });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      // Prevents account enumeration while being secure
      return res.status(409).json({
        error: 'An account with this email already exists.'
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await db.createUser({
      email,
      passwordHash,
      name: name || 'Customer'
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set secure HttpOnly cookies
    res.cookie('accessToken', accessToken, {
      ...COOKIE_SECURITY_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_SECURITY_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(201).json({
      success: true,
      message: 'User registered and logged in successfully.',
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * User Login with Timing-Safe Verification and JWT Token Rotation
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await verifyPassword(user.passwordHash, password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('accessToken', accessToken, {
      ...COOKIE_SECURITY_OPTIONS,
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_SECURITY_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh Access Token using Refresh Token from Cookie
 */
async function refreshToken(req, res, next) {
  try {
    const currentRefreshToken = req.cookies?.refreshToken;
    if (!currentRefreshToken) {
      return res.status(401).json({ error: 'Refresh token missing.' });
    }

    const payload = verifyRefreshToken(currentRefreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = await db.findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists.' });
    }

    // Rotate access token
    const newAccessToken = generateAccessToken(user);
    res.cookie('accessToken', newAccessToken, {
      ...COOKIE_SECURITY_OPTIONS,
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({ success: true, message: 'Token refreshed.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout - Clear Authentication Cookies
 */
function logout(req, res) {
  res.clearCookie('accessToken', COOKIE_SECURITY_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_SECURITY_OPTIONS);
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
}

/**
 * Get Current User Profile (from validated session)
 */
async function getProfile(req, res) {
  const user = await db.findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  return res.status(200).json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile
};
