'use strict';

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
 * Middleware for enforcing client scope /oauth/token route (pre-check)
 *
 * This scope is checked and blocked in the oauth2orize callback.
 * However, errors are difficult to trap in the callback, so
 * the scope is also pre-checked here to make elegant errors messages.
 *
 * Express req object required params: req.locals.clientScope
 *
 * Two clientScope parameters contains allowedScopes for
 *  Case 1: user token:  code grant, password grant, and refresh_token grant
 *  Case 2: client token: client_credentials grant
 *  Note: implicit gran does not pass through this route
 *
 * This value is parsed by the above addScopeToPassportReqObj function to be included
 * into the passport client authorization strategy, where req.locals.clientScope is added.
 *
 * If scope found, passes next(), else returns HTTP error
 *
 * @param {string|array} requiredUserScope - User role(s)
 * @param {string|array} requiredClientScope - Client allowedScope(s)
 */
exports.clientScopePrecheckForTokenHTTP = (requiredUserScope, requiredClientScope) => {
  if ((requiredUserScope == null) ||
    ((typeof requiredUserScope !== 'string') &&
    (!Array.isArray(requiredUserScope)))) {
    throw new Error('clientScopePrecheckForTokenHTTP requires string or array');
  }
  if (typeof requiredUserScope === 'string') {
    requiredUserScope = [requiredUserScope];
  }
  if ((requiredClientScope == null) ||
    ((typeof requiredClientScope !== 'string') &&
    (!Array.isArray(requiredClientScope)))) {
    throw new Error('clientScopePrecheckForTokenHTTP requires string or array');
  }
  if (typeof requiredClientScope === 'string') {
    requiredClientScope = [requiredClientScope];
  }
  return (req, res, next) => {
    if ((req.locals) && (req.locals.clientScope) &&
      (Array.isArray(req.locals.clientScope) &&
      (req.locals.clientScope.length > 0))) {
      if ((req.body.grant_type) &&
        ((req.body.grant_type === 'authorization_code') ||
        (req.body.grant_type === 'password') ||
        (req.body.grant_type === 'refresh_token'))) {
        let scopeFound = false;
        requiredUserScope.forEach((scopeString) => {
          if (req.locals.clientScope.indexOf(scopeString) >= 0) scopeFound = true;
        });
        if (scopeFound) {
          return next();
        } else {
          // WWW-Authenticate Response Header rfc2617 Section-3.2.1
          const wwwError = 'Bearer realm=user@' + config.site.ownHost +
          ' error="Bad Request", error_description="Client credentials insufficient scope"';
          return res.set('WWW-Authenticate', wwwError)
            .status(400)
            .send('Status 400, Bad Request, Client credentials insufficient scope');
        }
      } else if ((req.body.grant_type) && (req.body.grant_type === 'client_credentials')) {
        let scopeFound = false;
        requiredClientScope.forEach((scopeString) => {
          if (req.locals.clientScope.indexOf(scopeString) >= 0) scopeFound = true;
        });
        if (scopeFound) {
          return next();
        } else {
          // WWW-Authenticate Response Header rfc2617 Section-3.2.1
          const wwwError = 'Bearer realm=user@' + config.site.ownHost +
          ' error="Bad Request", error_description="Client credentials insufficient scope"';
          return res.set('WWW-Authenticate', wwwError)
            .status(400)
            .send('Status 400, Bad Request, Client credentials insufficient scope');
        }
      } else {
        // This should not occur due to scope validation
        throw new Error('Error, Scope not found in request object');
      }
    } else {
      // This should not occur, they are inserted by passport middleware
      throw new Error('Error, Scope not found in request object');
    }
  };
};

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
 * @param {string|array} requiredScope - User role(s) for admin access.
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

/**
 * Intercept data in multiple scope arrays.
 * @param   {Array} httpRequestedScope - Array of scope strings from HTTP request
 * @param   {Array} clientAllowedScope - Array of scope strings for client
 * @param   {Array} userRole - Array of scope strings for user
 * @returns {Array} Returns intercepted scope, or default scope
 */
exports.intersectReqCliUsrScopes = (httpRequestedScope, clientAllowedScope, userRole) => {
  // ------ when issuing a new token, uncomment this to show scope intersection arrays
  // console.log('httpRequestedScope\n', httpRequestedScope);
  // console.log('clientAllowedScope\n', clientAllowedScope);
  // console.log('userRole\n', userRole);

  const defaultScope = ['auth.none'];
  const scopeIntersection = [];

  if ((httpRequestedScope == null) || (httpRequestedScope.length === 0)) {
    return defaultScope;
  } else if ((clientAllowedScope == null) || (clientAllowedScope.length === 0)) {
    return defaultScope;
  } else if ((userRole == null) || (userRole.length === 0)) {
    return defaultScope;
  } else {
    httpRequestedScope.forEach((reqScope) => {
      if ((clientAllowedScope.indexOf(reqScope) >= 0) && (userRole.indexOf(reqScope) >= 0)) {
        scopeIntersection.push(reqScope);
      }
    });
    // ------ when issuing a token, uncomment this to show intersected scope
    // console.log('scopeIntersection\n', scopeIntersection);

    return scopeIntersection;
  }
};

/**
 * Intercept data in multiple scope arrays.
 * @param   {Array} httpRequestedScope - Array of scope strings from HTTP request
 * @param   {Array} clientAllowedScope - Array of scope strings for client
 * @returns {Array} Returns intercepted scope, or default scope
 */
exports.intersectReqCliScopes = (httpRequestedScope, clientAllowedScope, userRole) => {
  const defaultScope = ['auth.none'];
  const scopeIntersection = [];

  if ((httpRequestedScope == null) || (httpRequestedScope.length === 0)) {
    return defaultScope;
  } else if ((clientAllowedScope == null) || (clientAllowedScope.length === 0)) {
    return defaultScope;
  } else {
    httpRequestedScope.forEach((reqScope) => {
      if (clientAllowedScope.indexOf(reqScope) >= 0) {
        scopeIntersection.push(reqScope);
      }
    });
    return scopeIntersection;
  }
};

/**
 * Convert array of strings to comma separated list of scopes
 * @param   {Array} scopeArray - Array of scope strings
 * @returns {String} Returns string with comma separated scopes
 */
exports.toScopeString = (scopeArray) => {
  let scopeString = '';
  scopeArray.forEach((scope, i) => {
    if (i > 0) scopeString += ', ';
    scopeString += scope.toString();
  });
  return scopeString;
};

/**
 * Convert comma delimited string to scopes array removing whitespace
 * @param   {String} scopeArray - Comma delimited string
 * @returns {Array} Returns aray of scope strings
 */
exports.toScopeArray = (scopeString) => {
  if (typeof scopeString !== 'string') return [];
  let cleanString = '';
  const scopeStringLength = scopeString.length;
  for (let i = 0; i < scopeStringLength; i++) {
    if ((scopeString.charCodeAt(i) !== 32) &&
      (scopeString.charCodeAt(i) !== 10) &&
      (scopeString.charCodeAt(i) !== 13)) {
      cleanString += scopeString.charAt(i);
    }
  }
  return cleanString.split(',');
};
