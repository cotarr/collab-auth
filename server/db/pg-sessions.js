'use strict';

// const config = require('../config');

const pgPool = require('./pg-pool');

/**
 * This module is to clear all PostgreSQL sessions from database
 * Sessions are stored in app.js using connect-pg-simple
 * This is fully independant of session management in app.js
 */
exports.removeAll = () => {
  const query = {
    text: 'DELETE FROM session'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};
