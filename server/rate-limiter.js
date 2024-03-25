//
// IP Address based rate limit for network requests.
//

'use strict';

const rateLimit = require('express-rate-limit');

const config = require('./config');

/**
 * Middleware IP rate limiter for web server routes
 */
const webRateLimit = rateLimit({
  windowMs: config.limits.webRateLimitTimeMs,
  max: config.limits.webRateLimitCount,
  statusCode: 429,
  message: 'Too many requests',
  standardHeaders: false,
  legacyHeaders: false,
  requestPropertyName: 'webRateLimit'
});

/**
 * Middleware IP rate limiter for token API routes
 */
const tokenRateLimit = rateLimit({
  windowMs: config.limits.tokenRateLimitTimeMs,
  max: config.limits.tokenRateLimitCount,
  statusCode: 429,
  message: 'Too many requests',
  standardHeaders: false,
  legacyHeaders: false,
  requestPropertyName: 'tokenRateLimit'
});

/**
 * Middleware IP rate limiter to prevent excessive
 * calls to the fixed delay timer in the GET /login route
 *
 * Middleware function
 */
const loginFormRateLimit = rateLimit({
  windowMs: config.limits.passwordRateLimitTimeMs,
  max: config.limits.passwordRateLimitCount,
  statusCode: 429,
  message: 'Too many requests',
  standardHeaders: false,
  legacyHeaders: false,
  requestPropertyName: 'loginFormRateLimit'
});

/**
 * Password submission rate limiter using express-rate-limit
 * Limit per IP address for POST request to /login
 * Successful request add to count.
 *
 * Middleware function
 */
const passwordRateLimit = rateLimit({
  windowMs: config.limits.passwordRateLimitTimeMs,
  max: config.limits.passwordRateLimitCount,
  statusCode: 429,
  message: 'Too many requests',
  standardHeaders: false,
  legacyHeaders: false,
  requestPropertyName: 'passwordRateLimit'
});

/**
 * Reset password login IP address based rate limiter.
 * @param {Object} req - Express request object
 * @param {Object} user - User object from DB lookup
 * @returns {Promise} - Returns promise resolving to user object
*/
const loginRateLimitReset = (req, user) => {
  loginFormRateLimit.resetKey(req.ip);
  passwordRateLimit.resetKey(req.ip);
  return Promise.resolve(user);
};

module.exports = {
  webRateLimit,
  tokenRateLimit,
  loginFormRateLimit,
  passwordRateLimit,
  loginRateLimitReset
};
