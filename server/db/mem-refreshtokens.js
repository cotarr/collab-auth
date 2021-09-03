'use strict';

// The refresh tokens.
// You will use these to get access tokens to access your end point data through the means outlined
// in the RFC The OAuth 2.0 Authorization Framework: Bearer Token Usage
// (http://tools.ietf.org/html/rfc6750)

const jwt = require('jsonwebtoken');

/**
 * Tokens in-memory data structure which stores all of the refresh tokens
 */
let tokens = Object.create(null);

/**
 * Returns a refresh token if it finds one, otherwise returns null if one is not found.
 * @param   {String}  token - The token to decode to get the id of the refresh token to find.
 * @returns {Promise} resolved with the token
 */
exports.find = (token) => {
  try {
    const id = jwt.decode(token).jti;
    return Promise.resolve(tokens[id]);
  } catch (error) {
    return Promise.resolve(undefined);
  }
};

/**
 * Saves a refresh token, user id, client id, and scope. Note: The actual full refresh token is
 * never saved.  Instead just the ID of the token is saved.  In case of a database breach this
 * prevents anyone from stealing the live tokens.
 * @param   {Object}  token    - The refresh token (required)
 * @param   {Date}    expirationDate - The expiration (required)
 * @param   {String}  userID   - The user ID (required)
 * @param   {String}  clientID - The client ID (required)
 * @param   {String}  scope    - The scope (optional)
 * @param   {Array}   scope          - The scope array
 * @param   {String}  grantType      - The grant type
 * @param   {String}  authTime       - The time of user password authentication
 * @returns {Promise} resolved with the saved token
 */
exports.save = (token, expirationDate, userID, clientID, scope, grantType, authTime) => {
  const id = jwt.decode(token).jti;
  tokens[id] = { userID, expirationDate, clientID, scope, grantType, authTime };
  return Promise.resolve(tokens[id]);
};

/**
 * Deletes a refresh token
 * @param   {String}  token - The token to decode to get the id of the refresh token to delete.
 * @returns {Promise} resolved with the deleted token
 */
exports.delete = (token) => {
  try {
    const id = jwt.decode(token).jti;
    const deletedToken = tokens[id];
    delete tokens[id];
    return Promise.resolve(deletedToken);
  } catch (error) {
    return Promise.resolve(undefined);
  }
};

/**
 * Removes refresh tokens. It does this by looping through them all and then removing the
 * expired ones it finds.
 * @returns {Promise} resolved with an associative of refreshTokens that were expired
 */
exports.removeExpired = () => {
  const keys = Object.keys(tokens);
  const expired = keys.reduce((accumulator, key) => {
    if (new Date() > tokens[key].expirationDate) {
      const expiredToken = tokens[key];
      delete tokens[key];
      accumulator[key] = expiredToken; // eslint-disable-line no-param-reassign
    }
    return accumulator;
  }, Object.create(null));
  return Promise.resolve(expired);
};

/**
 * Removes all refresh tokens.
 * @returns {Promise} resolved with all removed tokens returned
 */
exports.removeAll = () => {
  const deletedTokens = tokens;
  tokens = Object.create(null);
  return Promise.resolve(deletedTokens);
};
