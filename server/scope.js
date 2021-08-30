'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const db = require('./db');

/**
 * Add client scope array to req.locals
 *
 * @param   {Object} req - Express request object
 * @param   {Object} client - Client object
 * @returns {Object} client - Client is returned unchanged.
 */
exports.addScopeToReq = (req, client) => {
  if (debuglog) console.log('scope.addScopeToReq (called)');
  if (!req.locals) req.locals = {};
  if (client.allowedScope) req.locals.clientScope = client.allowedScope;
  return client;
};

/**
 * Scope evaluation middleware, required scope = auth.info or greater
 *
 * If scope of requesting client credentials is accepted,
 * pass control to next(), else return status 403 Forbidden
 */
exports.requireAuthDotInfoForHTTP = (req, res, next) => {
  if (debuglog) console.log('scope.requireInfoForHTTP (called)');
  if ((req.locals) && (req.locals.clientScope)) {
    const scope = req.locals.clientScope;
    if (
      (scope.indexOf('auth.info') >= 0) ||
      (scope.indexOf('auth.token') >= 0) ||
      (scope.indexOf('auth.admin') >= 0)) {
      return next();
    }
  }
  return res.status(403).send(
    'Status 403, Forbidden, client token insufficient scope');
};

/**
 * Scope evaluation middleware, required scope = auth.token or greater
 *
 * If scope of requesting client credentials is accepted,
 * pass control to next(), else return status 403 Forbidden
 */

exports.requireAuthDotTokenforHTTP = (req, res, next) => {
  if (debuglog) console.log('scope.requireInfoForHTTP (called)');
  if ((req.locals) && (req.locals.clientScope)) {
    const scope = req.locals.clientScope;
    if (
      (scope.indexOf('auth.token') >= 0) ||
      (scope.indexOf('auth.admin') >= 0)) {
      return next();
    }
  }
  return res.status(403).send(
    'Status 403, Forbidden, client token insufficient scope');
};

/**
 * Scope evaluation middleware, required scope = auth.admin
 *
 * If scope of requesting client credentials is accepted,
 * pass control to next(), else return status 403 Forbidden
 */

exports.requireAuthDotAdminForHTTP = (req, res, next) => {
  if (debuglog) console.log('scope.requireInfoForHTTP (called)');
  if ((req.locals) && (req.locals.clientScope)) {
    const scope = req.locals.clientScope;
    if (
      (scope.indexOf('auth.admin') >= 0)) {
      return next();
    }
  }
  return res.status(403).send(
    'Status 403, Forbidden, client token insufficient scope');
};
/**
 * Middleware for enforcing Web Panel Scope Restrictions
 *
 * Usage:
 *    app.get('/path', requireScopeForWebPanel('api.scope'), renderPage);
 *    app.get('/path', requireScopeForWebPanel(['api.scope1', 'api.scope2']), renderPage);
 *
 * Express req object required params:
 *    req.user.id (for user scope lookup)
 *    req.user.username (for error message)
 *    req.user.name (for page header)
 *
 * If scope found, passes next(), else returns HTTP error
 */
exports.requireScopeForWebPanel = (requiredScope) => {
  if ((requiredScope == null) ||
    ((typeof requiredScope !== 'string') &&
    (!Array.isArray(requiredScope)))) {
    throw new Error('requireScopeForWebPanel requires string or array');
  }
  if (typeof requiredScope === 'string') {
    requiredScope = [requiredScope];
  }
  return (req, res, next) => {
    if ((req.user) && (req.user.id) && (req.user.name) && (req.user.username)) {
      db.users.find(req.user.id)
        .then((user) => {
          let scopeFound = false;
          if ((user) && (user.role) && (Array.isArray(user.role)) && (req.user.role.length > 0)) {
            requiredScope.forEach((scopeString) => {
              if (user.role.indexOf(scopeString) >= 0) scopeFound = true;
            });
          }
          if (scopeFound) {
            return next();
          } else {
            return res.status(403).send('Status 403, Forbidden, User role does not include required scope.');
          }
        })
        .catch((err) => {
          console.log(err.message || err);
          return res.status(401).send('Unauthorized');
        });
    } else {
      console.log('Error, User not found in request object');
      return res.status(401).send('Unauthorized');
    }
  }; // (req, res, next) => ...
}; // requireScopeForWebPanel
