'use strict';

//
// The configuration options of the server
//

const path = require('path');
const fs = require('fs');

// Import UNIX environment variables from .env file and add to process.env
require('dotenv').config();

const appVersion = JSON.parse(fs.readFileSync('package.json')).version;

// const nodeEnv = process.env.NODE_ENV || 'development';

exports.site = {
  vhost: process.env.SITE_VHOST || '*',
  authURL: process.env.SITE_AUTH_URL || 'http://127.0.0.1:3500',
  ownHost: process.env.SITE_OWN_HOST || '127.0.0.1:3500',
  // Example: "mailto:security@example.com",
  securityContact: process.env.SITE_SECURITY_CONTACT || '',
  // Example: "2022-12-26T11:40:35+00:00"
  securityExpires: process.env.SITE_SECURITY_EXPIRES || ''
};

exports.server = {
  appVersion: appVersion,
  serverTlsKey: process.env.SERVER_TLS_KEY ||
    path.join(__dirname, '../../data/tls-certs/privatekey.pem'),
  serverTlsCert: process.env.SERVER_TLS_CERT ||
    path.join(__dirname, '../../data/tls-certs/certificate.pem'),
  tls: (process.env.SERVER_TLS === 'true') || false,
  port: parseInt(process.env.SERVER_PORT || '3500'),
  pidFilename: process.env.SERVER_PID_FILENAME || '',
  logRotateInterval: process.env.SERVER_LOG_ROTATE_INTERVAL || '',
  logRotateSize: process.env.SERVER_LOG_ROTATE_SIZE || '',
  logFilter: process.env.SERVER_LOG_FILTER || ''
};

if (Object.hasOwn(process.env, 'SESSION_NOT_SESSION_COOKIE')) {
  console.log('\n------------------------------------------------------');
  console.log('Please check the configuration environment variables.');
  console.log('SESSION_NOT_SESSION_COOKIE was deprecated in v0.0.24');
  console.log('------------------------------------------------------\n');
}

exports.session = {
  rollingCookie: (process.env.SESSION_SET_ROLLING_COOKIE === 'true') || false,
  maxAge: parseInt(process.env.SESSION_EXPIRE_SEC || '3600') * 1000,
  ttl: parseInt(process.env.SESSION_EXPIRE_SEC || '3600'),
  pruneInterval: parseInt(process.env.SESSION_PRUNE_INTERVAL_SEC || '3600'),
  secret: process.env.SESSION_SECRET || 'A Secret That Should Be Changed',
  enablePgSessionStore: (process.env.SESSION_ENABLE_POSTGRES === 'true') || false
};

exports.database = {
  enablePgUserDatabase: (process.env.DATABASE_ENABLE_POSTGRES === 'true') || false,
  disableWebAdminPanel: (process.env.DATABASE_DISABLE_WEB_ADMIN_PANEL === 'true') || false,
  timeToCheckExpiredTokensSeconds: 3600,
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
    role: [
      'api.read',
      'user.password'
    ]
  }
};

exports.limits = {
  // Rate limit per IP address for POST requests to /login (10 per hour per IP address)
  passwordRateLimitCount: parseInt(process.env.LIMITS_PASSWORD_RATE_LIMIT_COUNT || '10'),
  passwordRateLimitTimeMs: parseInt(process.env.LIMITS_PASSWORD_RATE_LIMIT_MS || '3600000'),
  tokenRateLimitCount: parseInt(process.env.LIMITS_TOKEN_RATE_LIMIT_COUNT || '1000'),
  tokenRateLimitTimeMs: parseInt(process.env.LIMITS_TOKEN_RATE_LIMIT_MS || '3600000'),
  webRateLimitCount: parseInt(process.env.LIMITS_WEB_RATE_LIMIT_COUNT || '1000'),
  webRateLimitTimeMs: parseInt(process.env.LIMITS_WEB_RATE_LIMIT_MS || '3600000')
};

exports.oauth2 = {
  clientSecretAesKey: process.env.OAUTH2_CLIENT_SECRET_AES_KEY || 'A Secret That Should Be Changed',
  disableTokenGrant: (process.env.OAUTH2_DISABLE_TOKEN_GRANT === 'true') || false,
  disableCodeGrant: (process.env.OAUTH2_DISABLE_CODE_GRANT === 'true') || false,
  disableClientGrant: (process.env.OAUTH2_DISABLE_CLIENT_GRANT === 'true') || false,
  disablePasswordGrant: (process.env.OAUTH2_DISABLE_PASSWORD_GRANT === 'true') || false,
  disableRefreshTokenGrant: (process.env.OAUTH2_DISABLE_REFRESH_TOKEN_GRANT === 'true') || false,
  editorShowClientSecret: (process.env.OAUTH2_EDITOR_SHOW_CLIENT_SECRET === 'true') || false,
  authCodeLength: 24,
  authCodeExpiresInSeconds: parseInt(process.env.OAUTH2_AUTH_CODE_EXPIRES_IN_SECONDS || '10'),
  tokenExpiresInSeconds: parseInt(process.env.OAUTH2_TOKEN_EXPIRES_IN_SECONDS || '3600'),
  refreshTokenExpiresInSeconds:
    parseInt(process.env.OAUTH2_REFRESH_TOKEN_EXPIRES_IN_SECONDS || '2592000'),
  clientTokenExpiresInSeconds:
    parseInt(process.env.OAUTH2_CLIENT_TOKEN_EXPIRES_IN_SECONDS || '86400'),
  decisionTransactionIdLength: 16
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
  userPasswordMaxLength: 32,
  allScopesMaxLength: 1024,
  allowedRedirectURIMaxLength: 1024
};
