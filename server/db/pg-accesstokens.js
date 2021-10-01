'use strict';

const jwtUtils = require('../jwt-utils');
const pgPool = require('./pg-pool');

/**
 * Returns an access token if it finds one, otherwise returns null if one is not found.
 * @param   {String}  token - The token to decode to get the id of the access token to find.
 * @returns {Promise} resolved with the token if found, otherwise resolved with undefined
 */
exports.find = (token) => {
  // catch JWT decode errors
  try {
    const id = jwtUtils.decodeToken(token).jti;
    const query = {
      text: 'SELECT * FROM accesstokens WHERE id = $1',
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
 * Saves a access token, expiration date, user id, client id, and scope. Note: The actual full
 * access token is never saved.  Instead just the ID of the token is saved.  In case of a database
 * breach this prevents anyone from stealing the live tokens.
 * @param   {Object}  token          - The access token (required)
 * @param   {Date}    expirationDate - The expiration (required)
 * @param   {String}  userID         - The user ID (required)
 * @param   {String}  clientID       - The client ID (required)
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
      text: 'INSERT INTO accesstokens ' +
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
 * Deletes/Revokes an access token by getting the ID and removing it from the storage.
 * @param   {String}  token - The token to decode to get the id of the access token to delete.
 * @returns {Promise} resolved with the deleted token
 */
exports.delete = (token) => {
  // catch JWT decode errors
  try {
    const id = jwtUtils.decodeToken(token).jti;
    const query = {
      text: 'DELETE FROM accesstokens WHERE "id" = $1 RETURNING *',
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
 * Removes expired access tokens. This is done with SQL query
 * @returns {Promise} resolved with an associative of tokens that were expired
 */
exports.removeExpired = () => {
  const query = {
    text: 'DELETE FROM accesstokens WHERE "expirationDate" < now() RETURNING *'
  };
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

/**
 * Removes all access tokens.
 * @returns {Promise} resolved with all removed tokens returned
 */
exports.removeAll = () => {
  const query = {
    text: 'DELETE FROM accesstokens RETURNING *'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

/**
 * Query count for number of rows in table
 * @returns {Promise} resolved with integer value
 */
exports.rowCount = () => {
  const query = {
    text: 'SELECT COUNT(*) FROM accesstokens'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0].count;
    });
};
