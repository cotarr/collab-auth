'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const passport = require('passport');
const config = require('./config');

const db = require('./db');
const validate = require('./validate');

/**
 * This endpoint is for verifying a token.  This has the same signature to
 *
 * Description TODO
 */

exports.introspect = [
  passport.authenticate('bearer', { session: false }), (req, res) => {
    if (debuglog) {
      console.log('user.info passport.authenticate bearer (req, res) middleware (called)');
      if (req.authInfo) {
        console.log('    req.authInfo', req.authInfo);
        console.log('    req.user ', req.user);
      }
    }
    //
    // Build the response object
    // The req.authInfo if inserted by passport strategy.
    // The content is parsed in validate.token()
    //
    const resJson = {
      active: true,
      revocable: true,
      issuer: config.site.authURL + '/oauth/token',
      jti: req.authInfo.decoded.jti,
      sub: req.authInfo.decoded.sub,
      exp: req.authInfo.decoded.exp,
      iat: req.authInfo.decoded.iat,
      grant_type: req.authInfo.token.grantType,
      expires_in: Math.floor((req.authInfo.token.expirationDate.getTime() - Date.now()) / 1000),
      auth_time: Math.floor(req.authInfo.token.authTime.valueOf() / 1000),
      scope: req.authInfo.token.scope,
      client: req.authInfo.client
    };
    if (req.authInfo.user) {
      resJson.user = req.authInfo.user;
    }
    if (debuglog) console.log('    res.json ' + JSON.stringify(resJson, null, 2));
    res.json(resJson);
  }
];

/**
 * This endpoint is for revoking a token.  This has the same signature to
 * Google's token revocation system from:
 * https://developers.google.com/identity/protocols/OAuth2WebServer
 *
 * You call it like so
 * https://localhost:3000/api/revoke?token=someToken
 *
 * If the token is valid you get returned a 200 and an empty object
 * {}
 *
 * If the token is not valid you get a 400 Status and this returned
 * {
 *   "error": "invalid_token"
 * }
 * This will first try to delete the token as an access token.  If one is not found it will try and
 * delete the token as a refresh token.  If both fail then an error is returned.
 * @param   {Object}  req - The request
 * @param   {Object}  res - The response
 * @returns {Promise} Returns the promise for testing
 */
exports.revoke = (req, res) =>
  validate.tokenForHttp(req.query.token)
    .then(() => db.accessTokens.delete(req.query.token))
    .then((token) => {
      if (token == null) {
        return db.refreshTokens.delete(req.query.token);
      }
      return token;
    })
    .then((tokenDeleted) => validate.tokenExistsForHttp(tokenDeleted))
    .then(() => {
      if (debuglog) console.log('token.revoke (called)');
      res.json({});
    })
    .catch((err) => {
      res.status(err.status);
      res.json({ error: err.message });
    });
