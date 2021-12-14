'use strict';

// const config = require('../config');

const pgPool = require('./pg-pool');

/**
 * This module is to clear all PostgreSQL sessions from database
 * Sessions are stored in app.js using connect-pg-simple
 * This is fully independant of session management in app.js
 * (req not used in postgres. It is for compatibility with mem-sessions.js)
 */
exports.removeAll = (req) => {
  const query = {
    text: 'DELETE FROM session'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

/**
 * Query to count number of session stored in express session store using connect-pg-simple
 *
 * @params {Object} req - Node.js request object (Not used, only in MemoryStore conditional)
 * @returns {Promise} resolved with integer value
 */
exports.sessionCount = (req) => {
  const query = {
    text: 'SELECT COUNT(*) FROM session'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0].count;
    });
};
