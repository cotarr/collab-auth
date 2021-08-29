'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

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
