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
