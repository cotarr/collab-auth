'use strict';

/**
 * Inert function
 * This is to avoid generation of error when using
 * MemoryStore database in the development environment.
 * Sessions are stored in app.js using MemoryStore and
 * deletion of all sessions is not possible as it is with
 * a standard database.
 */
exports.removeAll = () => {
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
