'use strict';

// The refresh tokens.
// You will use these to get access tokens to access your end point data through the means outlined
// in the RFC The OAuth 2.0 Authorization Framework: Bearer Token Usage
// (http://tools.ietf.org/html/rfc6750)

const jwtUtils = require('../jwt-utils');
const pgPool = require('./pg-pool');

/**
 * Returns a refresh token if it finds one, otherwise returns null if one is not found.
 * @param   {String}  token - The token to decode to get the id of the refresh token to find.
 * @returns {Promise} resolved with the token
 */
exports.find = (token) => {
  // catch JWT decode errors
  try {
    const id = jwtUtils.decodeToken(token).jti;
    const query = {
      text: 'SELECT * FROM refreshtokens WHERE id = $1',
      values: [id]
    };
    return pgPool.query(query)
      .then((queryResponse) => {
        return queryResponse.rows[0];
      });
  } catch (err) {
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
  // catch JWT decode errors
  try {
    const id = jwtUtils.decodeToken(token).jti;
    const query = {
      text: 'INSERT INTO refreshtokens ' +
        '("id", "userID", "clientID", "expirationDate", "scope", "grantType", "authTime") ' +
        'VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      values: [id, userID, clientID, expirationDate, scope, grantType, authTime]
    };
    return pgPool.query(query)
      .then((queryResponse) => {
        return queryResponse.rows[0];
      });
  } catch (err) {
    return Promise.resolve(undefined);
  }
};

/**
 * Deletes a refresh token
 * @param   {String}  token - The token to decode to get the id of the refresh token to delete.
 * @returns {Promise} resolved with the deleted token
 */
exports.delete = (token) => {
  // catch JWT decode errors
  try {
    const id = jwtUtils.decodeToken(token).jti;
    const query = {
      text: 'DELETE FROM refreshtokens WHERE "id" = $1 RETURNING *',
      values: [id]
    };
    // Return Promise
    return pgPool.query(query)
      .then((queryResponse) => {
        return queryResponse.rows[0];
      });
  } catch (err) {
    return Promise.resolve(undefined);
  }
};

/**
 * Removes refresh tokens. It does this with a SQL query.
 * @returns {Promise} resolved with an associative of refreshTokens that were expired
 */
exports.removeExpired = () => {
  const query = {
    text: 'DELETE FROM refreshtokens WHERE "expirationDate" < now() RETURNING *'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

/**
 * Removes all refresh tokens.
 * @returns {Promise} resolved with all removed tokens returned
 */
exports.removeAll = () => {
  const query = {
    text: 'DELETE FROM refreshtokens RETURNING *'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};
