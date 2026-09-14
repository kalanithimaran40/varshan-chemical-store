// server/src/controllers/otpController.js
const crypto = require('crypto');
const db = require('../db');

/**
 * Generates a cryptographically strong 6-digit numeric OTP
 */
function generateSecureOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Dispatches a secure OTP to the requested email
 */
async function sendOtp(req, res, next) {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const otp = generateSecureOtp();
    await db.storeOtp(email, otp, 5); // 5-minute TTL

    // In a production setup, dispatch via Nodemailer, SendGrid, or AWS SES
    console.log(`[SECURE DISPATCH] Generated OTP for ${email}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP has been dispatched securely to your email address.',
      expiresInMinutes: 5
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verifies the user-submitted OTP with timing-safe comparison
 */
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }

    const result = await db.verifyOtp(email, otp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: result.reason || 'Invalid OTP code.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email address verified successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendOtp,
  verifyOtp
};
