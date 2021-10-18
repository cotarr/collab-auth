'use strict';

//
// The configuration options of the server
//

const path = require('path');

require('dotenv').config();

// const nodeEnv = process.env.NODE_ENV || 'development';

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
    path.join(__dirname, '../../data/token-certs/privatekey.pem'),
  serverTlsCert: process.env.SERVER_TLS_CERT ||
    path.join(__dirname, '../../data/token-certs/certificate.pem'),
  tls: (process.env.SERVER_TLS === 'true') || false,
  port: parseInt(process.env.SERVER_PORT || '3500'),
  pidFilename: process.env.SERVER_PID_FILENAME || ''
};

exports.session = {
  maxAge: (process.env.SESSION_EXPIRE_SEC * 1000) || (7 * 24 * 3600000),
  ttl: process.env.SESSION_EXPIRE_SEC || (7 * 24 * 3600),
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

exports.oauth2 = {
  clientSecretAesKey: process.env.OAUTH_CLIENT_SECRET_AES_KEY || 'A Secret That Should Be Changed',
  disableTokenGrant: (process.env.OAUTH2_DISABLE_TOKEN_GRANT === 'true') || false,
  disableCodeGrant: (process.env.OAUTH2_DISABLE_CODE_GRANT === 'true') || false,
  disableClientGrant: (process.env.OAUTH2_DISABLE_CLIENT_GRANT === 'true') || false,
  disablePasswordGrant: (process.env.OAUTH2_DISABLE_PASSWORD_GRANT === 'true') || false,
  disableRefreshTokenGrant: (process.env.OAUTH2_DISABLE_REFRESH_TOKEN_GRANT === 'true') || false,
  authCodeLength: 24,
  authCodeExpiresInSeconds: 60,
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
