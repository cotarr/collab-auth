'use strict';
// ---------------------------------------------------------------
// This module is to clear all PostgreSQL sessions from database
// It is inert for the case of MemoryStore
// ---------------------------------------------------------------

const config = require('../config');

let pgPool;
if (config.session.disableMemorystore) {
  pgPool = require('./pg-pool');
}

exports.removeAll = () => {
  if (config.session.disableMemorystore) {
    const query = {
      text: 'DELETE FROM session'
    };
    // Return Promise
    return pgPool.query(query);
  } else {
    // Can't do this with memorystore
    return Promise.resolve({});
  }
};
