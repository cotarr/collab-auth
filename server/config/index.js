'use strict';

//
// The configuration options of the server
//

const path = require('path');

require('dotenv').config();

// const nodeEnv = process.env.NODE_ENV || 'development';

// in the case of NODE_ENV=production, force logging to console.
exports.nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

exports.site = {
  vhost: process.env.SITE_VHOST || '*',
  authURL: process.env.SITE_AUTH_URL || 'http://127.0.0.1:3500',
  ownHost: process.env.SITE_OWN_HOST || '127.0.0.1:3500',
  // Example: "mailto:security@example.com",
  securityContact: process.env.SITE_SECURITY_CONTACT || '',
  // Example: "Fri, 1 Apr 2022 08:00:00 -0600"
  securityExpires: process.env.SITE_SECURITY_EXPIRES || ''
};

exports.server = {
  serverTlsKey: process.env.SERVER_TLS_KEY ||
    path.join(__dirname, './server/certs/privatekey.pem'),
  serverTlsCert: process.env.SERVER_TLS_CERT ||
    path.join(__dirname, './server/certs/certificate.pem'),
  tls: (process.env.SERVER_TLS === 'true') || false,
  port: parseInt(process.env.SERVER_PORT || '3500'),
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
      'auth.none',
      'auth.info',
      'auth.token',
      'api.read',
      'api.write'
    ],
    allowedRedirectURI: ['http://localhost:3000/login/callback']
  },
  defaultUser: {
    randomPasswordLength: 12,
    role: [
      'api.read',
      'user.password'
    ]
  }
};

exports.oauth2 = {
  disableTokenGrant: (process.env.OAUTH2_DISABLE_TOKEN_GRANT === 'true') || false,
  disableCodeGrant: (process.env.OAUTH2_DISABLE_CODE_GRANT === 'true') || false,
  disableClientGrant: (process.env.OAUTH2_DISABLE_CLIENT_GRANT === 'true') || false,
  disablePasswordGrant: (process.env.OAUTH2_DISABLE_PASSWORD_GRANT === 'true') || false,
  disableRefreshTokenGrant: (process.env.OAUTH2_DISABLE_REFRESH_TOKEN_GRANT === 'true') || false

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

exports.data = {
  clientNameMinLength: 1,
  clientNameMaxLength: 64,
  clientIdMinLength: 1,
  clientIdMaxLength: 40,
  clientSecretMinLength: 8,
  clientSecretMaxLength: 64,
  userNameMinLength: 1,
  userNameMaxLength: 64,
  userUsernameMinLength: 1,
  userUsernameMaxLength: 40,
  userPasswordMinLength: 8,
  userPasswordMaxLength: 64,
  allScopesMaxLength: 1024,
  allowedRedirectURIMaxLength: 1024
};
