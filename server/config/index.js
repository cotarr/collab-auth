'use strict';

//
// The configuration options of the server
//

const path = require('path');

require('dotenv').config();

exports.site = {
  vhost: process.env.SITE_VHOST || '*',
  authURL: process.env.SITE_AUTH_URL || 'http://127.0.0.1:3500',
  ownHost: process.env.SITE_OWN_HOST || '127.0.0.1:3500'
};

exports.server = {
  serverTlsKey: process.env.SERVER_TLS_KEY ||
    path.join(__dirname, './server/certs/privatekey.pem'),
  serverTlsCert: process.env.SERVER_TLS_CERT ||
    path.join(__dirname, './server/certs/certificate.pem'),
  tls: (process.env.SERVER_TLS === 'true') || false,
  port: process.env.SERVER_PORT || 3500,
  pidFilename: process.env.SERVER_PID_FILENAME || ''
};

exports.session = {
  maxAge: (process.env.SESSION_EXPIRE_SEC * 1000) || (7 * 24 * 3600000),
  ttl: process.env.SESSION_EXPIRE_SEC || (7 * 24 * 3600),
  secret: process.env.SESSION_SECRET || 'A Secret That Should Be Changed',
  disableMemorystore: (process.env.SESSION_DISABLE_MEMORYSTORE === 'true') || false
};

exports.database = {
  disableInMemoryDb: (process.env.DATABASE_DISABLE_INMEM_DB === 'true') || false,
  defaultClient: {
    randomSecretLength: 24,
    trustedClient: false,
    allowedScope: [
      'offline_access',
      'auth.none',
      'auth.info',
      'auth.token',
      'api.read',
      'api.write',
      'api.admin'
    ],
    defaultScope: ['auth.none'],
    allowedRedirectURI: ['http://localhost:3000/login/callback']
  },
  defaultUser: {
    randomPasswordLength: 12,
    role: [
      'offline_access',
      'auth.token',
      'api.read',
      'user.password'
    ]
  }
};

/**
 * Configuration of access tokens.
 *
 * expiresIn               - The time in seconds before the access token expires. Default is 60
 *                           minutes
 */
exports.token = {
  expiresIn: 3600
};

/**
 * Configuration of code token.
 * expiresIn - The time in seconds before the authorization code expires.
 */
exports.code = {
  length: 24,
  expiresIn: 60
};

/**
 * Decision configuration
 */
exports.decision = {
  // Transaction ID length
  idLength: 16
};

/**
 * Configuration of refresh token.
 * expiresIn - The time in minutes before the code token expires.  Default is 100 years.  Most if
 *             all refresh tokens are expected to not expire.  However, I give it a very long shelf
 *             life instead.
 */
exports.refreshToken = {
  expiresIn: 30 * 24 * 3600
};

/**
 * Database configuration for access and refresh tokens.
 *
 * timeToCheckExpiredTokens - The time in seconds to check the database for expired access tokens.
 *                            For example, if it's set to 3600, then that's one hour to check for
 *                            expired access tokens.
 */
exports.db = {
  timeToCheckExpiredTokens: 3600
};

if (global.debuglog) console.log('config.index loaded (init)');
