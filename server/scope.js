'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

exports.addScopeToReq = (req, client) => {
  if (debuglog) console.log('scope.addScopeToReq (called)');
  if (!req.locals) req.locals = {};
  if (client.allowedScope) req.locals.clientScope = client.allowedScope;
  return client;
};

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
