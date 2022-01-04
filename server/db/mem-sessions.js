'use strict';

/**
 * This module is to clear all MemoryStore sessions from database
 * Sessions are stored in app.js using memorystore.
 * This is fully independant of session management in app.js
 * @param {Object} req - Express request object
 * @returns {Promise} Resolves to empty object
 */
exports.removeAll = (req) => {
  req.sessionStore.clear();
  return Promise.resolve({});
};

/**
 * Count number of session stored in express session store using Memorystore
 * Memorystore has req API with callback returning length of the session store.
 * The callback is converted to promise.
 *
 * @param {Object} req - Node.js request object
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
