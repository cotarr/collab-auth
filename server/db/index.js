'use strict';

const config = require('../config');

const authorizationCodes = require('./authorizationcodes');
const clients = require('./clients');
const users = require('./users');

const sessions = require('./sessions');

let accessTokens;
let refreshTokens;
if (config.database.disableInMemoryDb) {
  console.log('Using PostgresSQL for OAuth2 storage.');
  accessTokens = require('./pg-accesstokens');
  refreshTokens = require('./pg-refreshtokens');
} else {
  console.log('Using memory variables for OAuth2 storage.');
  accessTokens = require('./accesstokens');
  refreshTokens = require('./refreshtokens');
}

module.exports = {
  accessTokens,
  authorizationCodes,
  clients,
  refreshTokens,
  users,
  sessions
};
