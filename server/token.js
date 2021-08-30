'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const passport = require('passport');
const config = require('./config');

const db = require('./db');
const validate = require('./validate');
const scope = require('./scope');

/**
 * This endpoint is for verifying a token and returning token information
 *
 * The introspect array contains an array of middlewares.
 *
 * 1) Authenticate HTTP request using passport with client credentials
 * 2) Check client's scope to see if introspect request is permitted
 * 3) Lookup token in database to make sure not revoked, returning stored token data
 * 4) Validate token signature, token's issuing client, and token's requesting user
 *      Validate() compiles and returns token meta data
 *        decoded: payload of decoded JWT token
 *        token:   stored token database contents
 *        client:  Client that issued token
 *        user:
 * 5) Return JSON object containing token information, or else return error
 */
exports.introspect = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  scope.requireScopeForOauthHTTP(['auth.info', 'auth.token', 'auth.admin']),
  (req, res, next) => {
    if (debuglog) console.log('token.introspect (req, res) middleware (called)');
    if ((req.body) && (req.body.access_token) &&
      (typeof req.body.access_token === 'string') &&
      (req.body.access_token.length > 0)) {
      const accessToken = req.body.access_token;
      db.accessTokens.find(accessToken)
        .then((token) => validate.token(token, accessToken))
        .then((tokenMetadata) => {
          // if (debuglog) console.log('    tokenMetadata ', tokenMetadata);
          const resJson = {
            active: true,
            revocable: true,
            issuer: config.site.authURL + '/oauth/token',
            jti: tokenMetadata.decoded.jti,
            sub: tokenMetadata.decoded.sub,
            exp: tokenMetadata.decoded.exp,
            iat: tokenMetadata.decoded.iat,
            grant_type: tokenMetadata.token.grantType,
            expires_in: Math.floor((tokenMetadata.token.expirationDate.getTime() - Date.now()) / 1000),
            auth_time: Math.floor(tokenMetadata.token.authTime.valueOf() / 1000),
            scope: tokenMetadata.token.scope,
            client: tokenMetadata.client
          };
          if (tokenMetadata.user) {
            resJson.user = tokenMetadata.user;
          }
          if (debuglog) console.log('    res.json ' + JSON.stringify(resJson, null, 2));
          res.json(resJson);
        })
        .catch(() => {
          res.status(401).send('Unauthorized');
        });
    } else {
      res.status(401).send('Unauthorized');
    }
  }
];

/**
 * This endpoint is for revoking tokens.
 * Accepts either access_token, refresh_token, or both
 *
 *    POST request
 *
 *    Authorization: client credentials
 *    Accepts Authorizaton header with base64 encoded client credentials,
 *    or alternately, it accepts client_id and client_secret in body of POST
 *
 *    req.body {
 *      access_token: 'xxxx',
 *      refresh_token: 'xxxx'
 *    }
 */
exports.revoke = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  scope.requireScopeForOauthHTTP(['auth.token', 'auth.admin']),
  (req, res, next) => {
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
  }
]; // exports.revoke
