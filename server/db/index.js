'use strict';

const config = require('../config');

// Authorization code storage will use server memory variables.
const authorizationCodes = require('./authorizationcodes');

const clients = require('./mem-clients');
const users = require('./mem-users');

// Placeholders
let accessTokens;
let refreshTokens;
let sessions;

if (config.database.disableInMemoryDb) {
  console.log('Using PostgresSQL for OAuth2 storage.');
  accessTokens = require('./pg-accesstokens');
  refreshTokens = require('./pg-refreshtokens');
  sessions = require('./pg-sessions');
} else {
  console.log('Using memory variables for OAuth2 storage.');
  accessTokens = require('./mem-accesstokens');
  refreshTokens = require('./mem-refreshtokens');
  sessions = require('./mem-sessions');
}

module.exports = {
  accessTokens,
  authorizationCodes,
  clients,
  refreshTokens,
  users,
  sessions
};
