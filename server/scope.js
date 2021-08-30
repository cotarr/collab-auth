'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const config = require('./config');
const db = require('./db');

/**
 * Add client scope array to req.locals
 *
 * Include in passport strategy to process as request passes through passport authorization.
 *
 * @param   {Object} req - Express request object
 * @param   {Object} client - Client object
 * @returns {Object} The client is returned unchanged.
 */
exports.addScopeToPassportReqObj = (req, client) => {
  if (debuglog) console.log('scope.addScopeToPassportReqObj (called)');
  if (!req.locals) req.locals = {};
  if (client.allowedScope) req.locals.clientScope = client.allowedScope;
  return client;
};

/**
 * Middleware for enforcing OAuth API scope Restrictions
 *
 * Usage:
 *    app.get('/path',
 *      passport.authenticate('some-strategy', { session: false }),
 *      requireScopeForOauthHTTP('api.scope'),
 *      handleRequest);
 *
 *    app.get('/path',
 *      passport.authenticate('some-strategy', { session: false }),
 *      requireScopeForOauthHTTP(['api.scope1', 'api.scope2']),
 *      handleRequest);
 *
 * Express req object required params: req.locals.clientScope
 *
 * The clientScope parameter contains allowedScopes form the client database entry.
 * This value is parsed by the above addScopeToPassportReqObj function to be included
 * into the passport client authorization strategy, where req.locals.clientScope is added.
 *
 * If scope found, passes next(), else returns HTTP error
 */
exports.requireScopeForOauthHTTP = (requiredScope) => {
  if ((requiredScope == null) ||
    ((typeof requiredScope !== 'string') &&
    (!Array.isArray(requiredScope)))) {
    throw new Error('requireScopeForOauthHTTP requires string or array');
  }
  if (typeof requiredScope === 'string') {
    requiredScope = [requiredScope];
  }
  return (req, res, next) => {
    let scopeFound = false;
    if ((req.locals) && (req.locals.clientScope) &&
      (Array.isArray(req.locals.clientScope) &&
      (req.locals.clientScope.length > 0))) {
      requiredScope.forEach((scopeString) => {
        if (req.locals.clientScope.indexOf(scopeString) >= 0) scopeFound = true;
      });
      if (scopeFound) {
        return next();
      } else {
        // Case where bearer token fail /introspect due to denied client allowedScope
        // WWW-Authenticate Response Header rfc2617 Section-3.2.1
        const wwwError = 'Bearer realm=user@' + config.site.ownHost +
        ' error="Bad Request", error_description="Client credentials insufficient scope"';
        return res.set('WWW-Authenticate', wwwError)
          .status(400)
          .send('Status 400, Bad Request, Client credentials insufficient scope');
      }
    } else {
      throw new Error('Error, Scope not found in request object');
    }
  }; // (req, res, next) => ...
}; // requireScopeForOauthHTTP()

/**
 * Middleware for enforcing Web Panel Scope Restrictions
 *
 * Usage:
 *
 *    app.get('/path',
 *      ensureLoggedIn(),
 *      requireScopeForWebPanel('api.scope'),
 *      renderPage);
 *
 *    app.get('/path',
 *      ensureLoggedIn(),
 *      requireScopeForWebPanel(['api.scope1', 'api.scope2']),
 *      renderPage);
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
            return res.status(403).send('Status 403, Forbidden, User role insufficient scope.');
          }
        })
        .catch((err) => {
          return next(err);
        });
    } else {
      throw new Error('Error, User not found in request object');
    }
  }; // (req, res, next) => ...
}; // requireScopeForWebPanel
