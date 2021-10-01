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

if (config.session.disableMemorystore) {
  sessions = require('./pg-sessions');
} else {
  sessions = require('./mem-sessions');
}

if (config.database.disableInMemoryDb) {
  console.log('Using PostgresSQL for OAuth2 storage.');
  accessTokens = require('./pg-accesstokens');
  refreshTokens = require('./pg-refreshtokens');
  clients = require('./pg-clients');
  users = require('./pg-users');
} else {
  console.log('Using memory variables for OAuth2 storage.');
  accessTokens = require('./mem-accesstokens');
  refreshTokens = require('./mem-refreshtokens');
  clients = require('./mem-clients');
  users = require('./mem-users');
}

module.exports = {
  accessTokens,
  authorizationCodes,
  clients,
  refreshTokens,
  users,
  sessions
};
