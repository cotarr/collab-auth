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
 * This endpoint is for revoking tokens.
 * Accepts either access_token, refresh_token, or both
 *
 *    POST request
 *
 *    req.body {
 *      access_token: 'xxxx',
 *      refresh_token: 'xxxx'
 *    }
 */
exports.revoke = (req, res) => {
  if (req.body.access_token) {
    validate.tokenForHttp(req.body.access_token)
      .then(() => db.accessTokens.delete(req.body.access_token))
      .then((deletedAccessToken) => validate.tokenExistsForHttp(deletedAccessToken))
      .then(() => {
        if (req.body.refresh_token) {
          // case of both access token and refresh token
          validate.tokenForHttp(req.body.refresh_token)
            .then(() => db.refreshTokens.delete(req.body.refresh_token))
            .then((deletedRefreshToken) => validate.tokenExistsForHttp(deletedRefreshToken));
        } else {
          // else, case of only access_token, but not refresh token
          return {};
        }
      })
      .then(() => {
        return res.json({});
      })
      .catch((err) => {
        res.status(err.status);
        res.json({ error: err.message });
      });
  } else {
    // case of missing access_token, checkfor refresh_token
    if (req.body.refresh_token) {
      validate.tokenForHttp(req.body.refresh_token)
        .then(() => db.refreshTokens.delete(req.body.refresh_token))
        .then((deletedRefreshToken) => validate.tokenExistsForHttp(deletedRefreshToken))
        .then(() => res.json({}))
        .catch((err) => {
          res.status(err.status);
          res.json({ error: err.message });
        });
    } else {
      const err = new Error('invalid_token');
      err.status = 400;
      res.status(err.status);
      res.json({ error: err.message });
    }
  }
}; // exports.revoke
