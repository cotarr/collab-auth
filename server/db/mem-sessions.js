'use strict';

/**
 * This module is to clear all MemoryStore sessions from database
 * Sessions are stored in app.js using memorystore.
 * This is fully independant of session management in app.js
 */
exports.removeAll = (req) => {
  req.sessionStore.clear();
  return Promise.resolve({});
};

/*
 * Count number of session stored in express session store using Memorystore
 * Memorystore has req API with callback returning length of the session store.
 * The callback is converted to promise.
 *
 * @params {Object} req - Node.js request object
 * @returns {Promise} resolved with integer value
 */
exports.sessionCount = (req) => {
  return new Promise(
    (resolve, reject) => {
      req.sessionStore.length(function (error, length) {
        if (error) {
          reject(error);
        } else {
          resolve(length);
        };
      });
    }
  );
};
