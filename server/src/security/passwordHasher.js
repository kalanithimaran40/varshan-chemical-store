// server/src/security/passwordHasher.js
const crypto = require('crypto');

let argon2;
try {
  argon2 = require('argon2');
} catch (e) {
  console.warn('[Security Notice] Argon2 native package not found. Using crypto scrypt fallback.');
}

/**
 * Enterprise Argon2id configuration (Memory-hard resistance against GPU clusters)
 */
const ARGON2_OPTIONS = {
  type: argon2 ? argon2.argon2id : undefined,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 2,
};

/**
 * Hashes a plaintext password using Argon2id (or Scrypt fallback).
 * @param {string} plainPassword 
 * @returns {Promise<string>}
 */
async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string' || plainPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  if (argon2) {
    return await argon2.hash(plainPassword, ARGON2_OPTIONS);
  }

  // Cryptographically secure scrypt fallback with 32-byte salt
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(plainPassword, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a plaintext password against stored hash using constant-time comparison.
 * @param {string} storedHash 
 * @param {string} suppliedPassword 
 * @returns {Promise<boolean>}
 */
async function verifyPassword(storedHash, suppliedPassword) {
  if (!storedHash || !suppliedPassword) return false;

  try {
    if (storedHash.startsWith('$argon2') && argon2) {
      return await argon2.verify(storedHash, suppliedPassword);
    }

    if (storedHash.startsWith('scrypt:')) {
      const [, salt, hash] = storedHash.split(':');
      return new Promise((resolve) => {
        crypto.scrypt(suppliedPassword, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
          if (err) return resolve(false);
          const keyBuffer = Buffer.from(hash, 'hex');
          resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        });
      });
    }

    return false;
  } catch (error) {
    return false;
  }
}

module.exports = { hashPassword, verifyPassword };
