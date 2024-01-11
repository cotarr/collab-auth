'use strict';

/**
 * Register supported grant types.
 *
 * OAuth 2.0 specifies a framework that allows users to grant client
 * applications limited access to their protected resources.  It does this
 * through a process of the user granting access, and the client exchanging
 * the grant for an access token.
 */

// NPM packages
const passport = require('passport');
const oauth2orize = require('oauth2orize');
const uid2 = require('uid2');
const csrf = require('@dr.pogodin/csurf');
const csrfProtection = csrf({ cookie: false });

// Custom modules
const config = require('./config');
const db = require('./db');
const jwtUtils = require('./jwt-utils');
const { checkSessionAuth } = require('./session-auth');

const {
  toScopeString,
  intersectReqCliUsrScopes,
  intersectReqCliScopes,
  requireScopeForOauthHTTP,
  clientScopePrecheckForTokenHTTP
} = require('./scope');
const validate = require('./validate');
const inputValidation = require('./input-validation');
const stats = require('./stats');

// create OAuth 2.0 server
const server = oauth2orize.createServer();

/**
 * Grant authorization codes
 *
 * The callback takes the `client` requesting authorization, the `redirectURI`
 * (which is used as a verifier in the subsequent exchange), the authenticated
 * `user` granting access, and their response, which contains approved scope,
 * duration, etc. as parsed by the application.  The application issues a code,
 * which is bound to these values, and will be exchanged for an access token.
 *
 * The scope to be included with the requested token is saved here with the
 * authorization code. The scope was created in the authorization endpoint.
 * The scope was previously saved to `req.oauth2.req.tokenScope` when the
 * authorization transaction was initiated and appears here as `areq.tokenScope`.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 */
server.grant(oauth2orize.grant.code((client, redirectURI, user, ares, areq, locals, done) => {
  // Check if code grant is disabled in the config
  // This is pre-checked in input validation to inhibit a hard error here
  if (config.oauth2.disableCodeGrant) {
    const err = new Error('grant_type code (code grant) is disabled');
    return done(err);
  }
  // Check if scope is sufficient (2 places, also in exchange code)
  // This is pre-checked in in authorization endpoint middleware to inhibit a hard error here
  if ((client.allowedScope == null) || (client.allowedScope.indexOf('auth.token') < 0)) {
    const err = new Error('Code grant requires scope: auth.token');
    return done(err);
  }

  // Authorization code length (characters)
  const code = uid2(config.oauth2.authCodeLength);
  const expiration = new Date(Date.now() + (config.oauth2.authCodeExpiresInSeconds * 1000));
  db.authorizationCodes.save(code, client.id, redirectURI, user.id, expiration, areq.tokenScope)
    .then(() => done(null, code))
    .catch((err) => done(err));
}));

/**
 * Grant implicit authorization.
 *
 * The callback takes the `client` requesting authorization, the authenticated
 * `user` granting access, and their response, which contains approved scope,
 * duration, etc. as parsed by the application.  The application issues a token,
 * which is bound to these values.
 *
 * The scope was included with the requested token was created in the authorization endpoint.
 * The scope was previously saved to `req.oauth2.req.tokenScope` when the
 * authorization transaction was initiated and appears here as `areq.tokenScope`.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 */
server.grant(oauth2orize.grant.token((client, user, ares, areq, locals, done) => {
  // Check if implicit grant is disabled in the config
  // This is pre-checked in input validation to inhibit a hard error here
  if (config.oauth2.disableTokenGrant) {
    const err = new Error('response_type token (implicit grant) is disabled');
    return done(err);
  }

  // Check if scope is sufficient
  // This is pre-checked in the authorization endpoint middleware to inhibit a hard error here
  if ((client.allowedScope == null) || (client.allowedScope.indexOf('auth.token') < 0)) {
    const err = new Error('Token grant (Implicit grant) requires scope: auth.token');
    return done(err);
  }

  const grantType = 'implicit';
  const token = jwtUtils.createToken({ sub: user.id, exp: config.oauth2.tokenExpiresInSeconds });
  const expiration = new Date(Date.now() + (config.oauth2.tokenExpiresInSeconds * 1000));
  const authTime = new Date();
  // Note responseParams returned in redirect URL query parameter
  const responseParams = {
    expires_in: config.oauth2.tokenExpiresInSeconds
    // *** removed next 3 in order to clean up redirect query string
    // grant_type: grantType,
    // scope: client.scope,
    // auth_time: Math.floor(authTime.valueOf() / 1000)
  };
  db.accessTokens.save(token, expiration, user.id, client.id, areq.tokenScope, grantType, authTime)
    .then(() => stats.incrementCounterPm({}, 'userToken'))
    .then(() => done(null, token, responseParams))
    .catch((err) => done(err));
}));

/**
 * Exchange authorization codes for access tokens.
 *
 * The callback accepts the `client`, which is exchanging `code` and any
 * `redirectURI` from the authorization request for verification.  If these values
 * are validated, the application issues an access token on behalf of the user who
 * authorized the code.
 *
 * The scope was saved to the authorization code in the code.grant above.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 */
server.exchange(oauth2orize.exchange.code((client, code, redirectURI, body, authInfo, done) => {
  // Check if code grant is disabled in the config
  // This is pre-checked in input validation to inhibit a hard error here
  if (config.oauth2.disableCodeGrant) {
    const err = new Error('grant_type code (code grant) is disabled');
    return done(err);
  }

  // Check if scope is sufficient
  // This is pre-checked in authorization endpoint middleware to inhibit hard error here
  if ((client.allowedScope == null) || (client.allowedScope.indexOf('auth.token') < 0)) {
    const err = new Error('Exchange code (Code grant) requires scope: auth.token');
    return done(err);
  }

  const responseParams = {
    expires_in: config.oauth2.tokenExpiresInSeconds,
    grant_type: 'authorization_code'
  };

  // Find and delete authorization code, returning deleted authorization code
  // Deleted code contains { clientID: redirectURI: userID: scope: }
  db.authorizationCodes.delete(code)
    // validate returns authCode or throws error
    .then((authCode) => validate.authCode(code, authCode, client, redirectURI))
    // authcode { clientID: redirectURI: userID: scope: }
    .then((authCode) => {
      authCode.grantType = 'authorization_code';
      authCode.authTime = new Date();
      responseParams.auth_time = Math.floor(authCode.authTime.valueOf() / 1000);
      responseParams.scope = authCode.scope;
      return validate.generateTokens(authCode);
    })
    // tokens is either [accesstoken] or [accessToken, refreshToken]
    .then((tokens) => {
      if (tokens.length === 1) {
        return done(null, tokens[0], null, responseParams);
      }
      if (tokens.length === 2) {
        return done(null, tokens[0], tokens[1], responseParams);
      }
      throw new Error('Error exchanging auth code for tokens');
    })
    .catch(() => done(null, false));
}));

/**
 * Exchange user id and password for access tokens.
 *
 * The callback accepts the `client`, which is exchanging the user's name and password
 * from the token request for verification. If these values are validated, the
 * application issues an access token on behalf of the user who authorized the code.
 *
 * The sources of token scope are all visible in this function.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 */
server.exchange(oauth2orize.exchange.password(
  (client, username, password, scope, body, authInfo, done) => {
    // Check if password grant disabled in the config
    // This is pre-checked in input validation to inhibit a hard error here
    if (config.oauth2.disablePasswordGrant) {
      const err = new Error('grant_type password (password grant) is disabled');
      return done(err);
    }

    // Check if scope is sufficient
    // This is pre-checked in token endpoint middleware to inhibit hard error here
    if ((client.allowedScope == null) || (client.allowedScope.indexOf('auth.token') < 0)) {
      const err = new Error('Password grant requires scope: auth.token');
      return done(err);
    }

    const responseParams = {
      expires_in: config.oauth2.tokenExpiresInSeconds,
      scope: scope,
      grant_type: 'password'
    };
    db.users.findByUsername(username)
      .then((user) => validate.user(user, password))
      .then((user) => {
        // Compile token scope
        const tokenScope = intersectReqCliUsrScopes(scope, client.allowedScope, user.role);
        responseParams.scope = tokenScope;
        const authTime = new Date();
        responseParams.auth_time = Math.floor(authTime.valueOf() / 1000);
        return validate.generateTokens({
          scope: tokenScope,
          userID: user.id,
          clientID: client.id,
          grantType: 'password',
          authTime: authTime
        });
      })
      .then((tokens) => {
        if (tokens === false) {
          return done(null, false);
        }
        // See above: done(err, accessToken, refreshToken, params)
        if (tokens.length === 1) {
          return done(null, tokens[0], null, responseParams);
        }
        if (tokens.length === 2) {
          return done(null, tokens[0], tokens[1], responseParams);
        }
        throw new Error('Error exchanging password for tokens');
      })
      .catch(() => done(null, false));
  }
));

/**
 * Exchange the client id and password/secret for an access token.
 *
 * The callback accepts the `client`, which is exchanging the client's id and
 * password/secret from the token request for verification. If these values are validated, the
 * application issues an access token on behalf of the client who authorized the code.
 *
 * For client credentials, there is no user authentication involved with this transaction.
 * Therefore the scope is based solely on the request and client definition.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - the `scope` submitted in the authorization request.
 */
server.exchange(oauth2orize.exchange.clientCredentials((client, scope, body, authInfo, done) => {
  // Check if client grant is disabled in the config
  // This is pre-checked in input validation to inhibit a hard error here
  if (config.oauth2.disableClientGrant) {
    const err = new Error('grant_type client_credentials (client grant) is disabled');
    return done(err);
  }

  // Check if scope is sufficient
  // This is pre-checked in token endpoint middleware to inhibit hard error here
  if ((client.allowedScope == null) || (client.allowedScope.indexOf('auth.client') < 0)) {
    const err = new Error('Client credentials grant requires scope: auth.client');
    return done(err);
  }

  // Compile token scope
  const tokenScope = intersectReqCliScopes(scope, client.allowedScope);
  const token =
    jwtUtils.createToken({ sub: client.id, exp: config.oauth2.clientTokenExpiresInSeconds });
  const expiration = new Date(Date.now() + (config.oauth2.clientTokenExpiresInSeconds * 1000));
  const authTime = new Date();
  const grantType = 'client_credentials';
  const responseParams = {
    expires_in: config.oauth2.clientTokenExpiresInSeconds,
    scope: tokenScope,
    grantType: grantType,
    auth_time: Math.floor(authTime.valueOf() / 1000)
  };

  //
  // Pass in a null for user id since there is no user when using this grant type
  db.accessTokens.save(token, expiration, null, client.id, tokenScope, grantType, authTime)
    .then(() => stats.incrementCounterPm({}, 'clientToken'))
    .then(() => done(null, token, null, responseParams))
    .catch((err) => done(err));
}));

/**
 * Exchange the refresh token for an access token.
 *
 * The callback accepts the `client`, which is exchanging the client's id from the token
 * request for verification.  If this value is validated, the application issues an access
 * token on behalf of the client who authorized the code
 *
 * The scope used to create the replacement access_token is retrieved from the
 * refresh_token record in the database.
 */
server.exchange(oauth2orize.exchange.refreshToken(
  (client, refreshToken, scope, body, authInfo, done) => {
    // Check refresh_token grant disabled in the config
    // This is pre-checked in input validation to inhibit a hard error here
    if (config.oauth2.disableRefreshTokenGrant) {
      const err = new Error('grant_type refresh_token (Refresh token grant) is disabled');
      return done(err);
    }

    // Check if scope is sufficient
    // This is pre-checked in token endpoint middleware to inhibit hard error here
    if ((client.allowedScope == null) || (client.allowedScope.indexOf('auth.token') < 0)) {
      const err = new Error('Refresh token grant requires scope: auth.token');
      return done(err);
    }

    const responseParams = {
      expires_in: config.oauth2.tokenExpiresInSeconds,
      grant_type: 'refresh_token'
    };
    db.refreshTokens.find(refreshToken)
      .then((token) => validate.tokenNotNull(token, 'refresh_token not found'))
      .then((token) => validate.token(token, refreshToken))
      .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
        'refresh_token failed validation'))
      .then((tokenMetaData) => {
        // verify, only client that issues the refresh token may renew it
        // client parameter comes from passport client authorization
        // tokenMetaData.client comes from issued token lookup in database
        if (client.id === tokenMetaData.client.id) {
          responseParams.scope = tokenMetaData.token.scope;
          responseParams.auth_time = tokenMetaData.token.authTime;
          // replace "authorization_code" with "refresh_token"
          tokenMetaData.token.grantType = 'refresh_token';
          return validate.generateToken(tokenMetaData.token);
        } else {
          console.log('Error, refresh_token wrong client');
          throw new Error('refresh_token client ID not match');
        }
      })
      // See above: done(err, accessToken, refreshToken, params)
      .then((token) => done(null, token, null, responseParams))
      .catch(() => done(null, false));
  }
));

/*
 * User authorization endpoint
 *
 * /dialog/authorize
 *
 * `authorization` middleware accepts a `validate` callback which is
 * responsible for validating the client making the authorization request.  In
 * doing so, the `redirectURI` be checked against a registered value included
 * in the client record, although security requirements may vary across
 * implementations.  Once validated, the `done` callback must be invoked with
 * a `client` instance, as well as the `redirectURI` to which the user will be
 * redirected after an authorization decision is obtained.
 *
 * This middleware simply initializes a new authorization transaction.  It is
 * the application's responsibility to authenticate the user and render a dialog
 * to obtain their approval (displaying details about the client requesting
 * authorization).  We accomplish that here by routing through `checkSessionAuth()`
 * first, and rendering the `dialog` view.
 *
 * At this step, the scope of the requested token is formed.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 * The intersected scope is saved to `req.oauth2.req.tokenScope` and it
 * will be used later to be saved with the authorization code
 * and subsequently used during exchange of code for token.
 */
exports.authorization = [
  checkSessionAuth(),
  inputValidation.dialogAuthorization,
  csrfProtection,
  server.authorization({ idLength: config.oauth2.decisionTransactionIdLength },
    (clientID, redirectURI, scope, grantType, done) => {
      db.clients.findByClientId(clientID)
        .then((client) => {
          // For security purposes, it is highly advisable to check that
          // redirectURI provided by the client matches one registered with
          // the server.
          if ((client) && (client.allowedRedirectURI) && (client.allowedRedirectURI.length > 0) &&
            (client.allowedRedirectURI.indexOf(redirectURI) >= 0)) {
            return done(null, client, redirectURI);
          } else {
            if (!client) {
              throw new Error('clientId not found');
            } else {
              throw new Error('redirectURI not found');
            }
          }
        })
        .catch((err) => done(err));
    }
  ),
  (req, res, next) => {
    // intercepted scope is saved here for use later to be saved with the authorization code.
    req.oauth2.req.tokenScope = intersectReqCliUsrScopes(
      req.oauth2.req.scope, req.oauth2.client.allowedScope, req.user.role);
    //
    // Render the decision dialog if the client isn't a trusted client
    // TODO:  Make a mechanism so that if this isn't a trusted client, the user can record that
    // they have consented but also make a mechanism so that if the user revokes access to any of
    // the clients then they will have to re-consent.
    db.clients.findByClientId(req.query.client_id)
      .then((client) => {
        // check if client has sufficient scope to request tokens
        // The /dialog/authorization can not be pre-checked for scope restrictions in
        // the inputValidation because the client has not been looked up in the database
        // at that point, it the scope is being checked here as middleware.
        // This is a pre-check. The oauth2orize callback will enforce it during processing.
        if ((client.allowedScope == null) ||
          (client.allowedScope.indexOf('auth.token') < 0)) {
          const err = new Error('Oauth2 authorization requires scope: auth.token');
          err.status = 400;
          throw err;
        } else {
          return client;
        }
      })
      .then((client) => {
        if (client != null && client.trustedClient && client.trustedClient === true) {
          // This is how we short call the decision like the dialog below does
          server.decision({ loadTransaction: false }, (serverReq, callback) => {
            // o2authorize parse function callback (err, ares, locals)
            callback(null, { allow: true });
          })(req, res, next);
        } else {
          res.set('Cache-Control', 'no-store').render('dialog', {
            csrfToken: req.csrfToken(),
            // Insert transaction code to form for processing by /dialog/authorization/decision
            transactionID: req.oauth2.transactionID,
            user: req.user,
            client: req.oauth2.client,
            scopeString: toScopeString(req.oauth2.req.tokenScope)
          });
        }
      })
      .catch((err) => next(err));
  },
  // This handler remove the transaction from session
  server.authorizationErrorHandler(),
  // This handler detect error and handles proper message
  server.errorHandler()
];

/**
 * User decision endpoint
 *
 * /dialog/authorize/decision
 *
 * `decision` middleware processes a user's decision to allow or deny access
 * requested by a client application.  Based on the grant type requested by the
 * client, the above grant middleware configured above will be invoked to send
 * a response.
 *
 * To cancel decision, form should post body with cancel: 'Deny'
 *   body: {
 *     "transaction_id": "xxxxxxxxx",
 *     "cancel": "Deny"
 *  }
 *
 * There is no check restriction here because it is protected by transaction code.
 *
 * authorizationErrorHandler removes transaction from session
 */
exports.decision = [
  checkSessionAuth(),
  inputValidation.dialogAuthDecision,
  csrfProtection,
  server.decision(),
  server.authorizationErrorHandler(),
  server.errorHandler()
];

/**
 * /oauth/token
 *
 * Token endpoint
 *
 * `token` middleware handles client requests to exchange authorization grants
 * for access tokens.  Based on the grant type being exchanged, the above
 * exchange middleware will be invoked to handle the request.  Clients must
 * authenticate when making requests to this endpoint.
 *
 * Client credentials may be either Basic with base64 encoded Basic Authorization header,
 * or client_id and client_secret in body of request. Either will work.
 *
 * Scope restriction for API access, not issue token. Additional scope checks follow.
 */
exports.token = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  inputValidation.oauthToken,
  clientScopePrecheckForTokenHTTP(['auth.token'], ['auth.client']),
  server.token(),
  server.errorHandler()
];

/**
 * This endpoint is for revoking tokens.
 *
 * /oauth/token/revoke
 *
 * Accepts either access_token, refresh_token, or both
 *
 *    POST request
 *
 *    Authorization: client credentials
 *    Accepts Authorization header with base64 encoded client credentials,
 *    or alternately, it accepts client_id and client_secret in body of POST
 *
 *    req.body {
 *      access_token: 'xxxx',
 *      refresh_token: 'xxxx'
 *    }
 *
 * Scope restriction for API access, not revoke token.
 */
exports.revoke = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  inputValidation.oauthTokenRevoke,
  requireScopeForOauthHTTP(['auth.token', 'auth-client']),
  (req, res, next) => {
    if ((req.body) && (req.body.access_token) &&
      (typeof req.body.access_token === 'string') &&
      (req.body.access_token.length > 0)) {
      // Case of access token found in body of request
      const accessToken = req.body.access_token;
      db.accessTokens.find(accessToken)
        .then((token) => validate.tokenNotNull(token, 'access_token not found'))
        .then((token) => validate.token(token, accessToken))
        .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
          'access_token failed validation'))
        .then(() => db.accessTokens.delete(accessToken))
        .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
          'error deleting access_token'))
        .then(() => {
          if ((req.body) && (req.body.refresh_token) &&
            (typeof req.body.refresh_token === 'string') &&
            (req.body.refresh_token.length > 0)) {
            // Case of refresh_token found in addition to previous access token
            const refreshToken = req.body.refresh_token;
            return db.refreshTokens.find(refreshToken)
              .then((token) => validate.tokenNotNull(token, 'refresh_token not found'))
              .then((token) => validate.token(token, refreshToken))
              .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
                'refresh_token failed validation'))
              .then(() => db.refreshTokens.delete(refreshToken))
              .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
                'error deleting refresh token'));
          } else {
            // else, case of only access_token, but not refresh token
            return {};
          }
        })
        .then(() => {
          return res.json({});
        })
        .catch((err) => next(err));
    } else {
      if ((req.body) && (req.body.refresh_token) &&
        (typeof req.body.refresh_token === 'string') &&
        (req.body.access_refresh.length > 0)) {
        // case of missing access_token, revoke only the refresh token
        const refreshToken = req.body.refresh_token;
        db.refreshTokens.find(refreshToken)
          .then((token) => validate.tokenNotNull(token, 'refresh_token not found'))
          .then((token) => validate.token(token, refreshToken))
          .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
            'refresh_token failed validation'))
          .then(() => db.refreshTokens.delete(refreshToken))
          .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
            'error deleting refresh_token'))
          .catch((err) => next(err));
      } else {
        // Case of no valid tokens found, access_token or refresh_token
        const err = new Error('invalid_token');
        err.status = 400;
        next(err);
      }
    }
  }
]; // exports.revoke

/**
 * This endpoint is for verifying a token and returning token information
 *
 * /oauth/introspect
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
 *
 *  Scope restriction for API access, not issue token. Additional scope checks follow.
 */
exports.introspect = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  inputValidation.oauthIntrospect,
  requireScopeForOauthHTTP(['auth.info', 'auth.token', 'auth.client']),
  (req, res, next) => {
    if ((req.body) && (req.body.access_token) &&
      (typeof req.body.access_token === 'string') &&
      (req.body.access_token.length > 0)) {
      const accessToken = req.body.access_token;
      db.accessTokens.find(accessToken)
        .then((token) => validate.tokenNotNull(token, 'access_token not found'))
        .then((token) => validate.token(token, accessToken))
        .then((tokenMetaData) => validate.tokenNotNull(tokenMetaData,
          'access_token validation failed'))
        .then((tokenMetaData) => {
          stats.incrementCounterFn('introspect');
          const resJson = {
            active: true,
            revocable: true,
            issuer: config.site.authURL + '/oauth/token',
            jti: tokenMetaData.decoded.jti,
            sub: tokenMetaData.decoded.sub,
            exp: tokenMetaData.decoded.exp,
            iat: tokenMetaData.decoded.iat,
            grant_type: tokenMetaData.token.grantType,
            expires_in: Math.floor(
              (tokenMetaData.token.expirationDate.getTime() - Date.now()) / 1000),
            auth_time: Math.floor(tokenMetaData.token.authTime.valueOf() / 1000),
            scope: tokenMetaData.token.scope,
            client: tokenMetaData.client
          };
          if (tokenMetaData.user) {
            resJson.user = tokenMetaData.user;
          }
          res.json(resJson);
        })
        .catch(() => {
          res.set('Content-Type', 'text/plain').status(401).send('Unauthorized');
        });
    } else {
      res.set('Content-Type', 'text/plain').status(401).send('Unauthorized');
    }
  }
];

/**
 * Register serialization and deserialization functions.
 *
 * When a client redirects a user to user authorization endpoint, an
 * authorization transaction is initiated.  To complete the transaction, the
 * user must authenticate and approve the authorization request.  Because this
 * may involve multiple HTTPS request/response exchanges, the transaction is
 * stored in the session.
 *
 * An application must supply serialization functions, which determine how the
 * client object is serialized into the session.  Typically this will be a
 * simple matter of serializing the client's ID, and deserializing by finding
 * the client by ID from the database.
 */
server.serializeClient((client, done) => done(null, client.id));

server.deserializeClient((id, done) => {
  db.clients.find(id)
    .then((client) => done(null, client))
    .catch((err) => done(err));
});
