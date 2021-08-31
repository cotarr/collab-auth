'use strict';

const config = require('../config');

// Authorization code storage will use server memory variables.
const authorizationCodes = require('./authorizationcodes');

// Placeholders
let accessTokens;
let refreshTokens;
let sessions;
let clients;
let users;

if (config.database.disableInMemoryDb) {
  console.log('Using PostgresSQL for OAuth2 storage.');
  accessTokens = require('./pg-accesstokens');
  refreshTokens = require('./pg-refreshtokens');
  clients = require('./pg-clients');
  users = require('./pg-users');
  sessions = require('./pg-sessions');
} else {
  console.log('Using memory variables for OAuth2 storage.');
  accessTokens = require('./mem-accesstokens');
  refreshTokens = require('./mem-refreshtokens');
  clients = require('./mem-clients');
  users = require('./mem-users');
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
