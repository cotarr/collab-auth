'use strict';

/**
 * Register supported grant types.
 *
 * OAuth 2.0 specifies a framework that allows users to grant client
 * applications limited access to their protected resources.  It does this
 * through a process of the user granting access, and the client exchanging
 * the grant for an access token.
*/

const config = require('./config');
const db = require('./db');
const login = require('connect-ensure-login');
const oauth2orize = require('oauth2orize');
const passport = require('passport');
const utils = require('./utils');
const { intersectReqCliUsrScopes, intersectReqCliScopes, toScopeString } = require('./scope');
const validate = require('./validate');
const inputValidation = require('./input-validation');
const uid2 = require('uid2');

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
 * The scope was previously saved to `req.oauth2.req.tokenscope` when the
 * authorization transaction was initiated and appears here as `areq.tokenScope`.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 */
server.grant(oauth2orize.grant.code((client, redirectURI, user, ares, areq, locals, done) => {
  // Check if code grant is disabled in the config
  if (config.oauth2.disableCodeGrant) {
    const err = new Error('grant_type code (code grant) is disabled');
    return done(err);
  }

  // Authorization code length (characters)
  const code = uid2(config.code.length);
  const expiration = new Date(Date.now() + (config.code.expiresIn * 1000));
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
 * The scope was previously saved to `req.oauth2.req.tokenscope` when the
 * authorization transaction was initiated and appears here as `areq.tokenScope`.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 */
server.grant(oauth2orize.grant.token((client, user, ares, areq, locals, done) => {
  // Check if implicit grant is disabled in the config
  if (config.oauth2.disableTokenGrant) {
    const err = new Error('response_type token (implicit grant) is disabled');
    return done(err);
  }

  const grantType = 'implicit';
  const token = utils.createToken({ sub: user.id, exp: config.token.expiresIn });
  const expiration = new Date(Date.now() + (config.token.expiresIn * 1000));
  const authTime = new Date();
  // Note responseParams returned in redirect URL query parameter
  const responseParams = {
    expires_in: config.token.expiresIn
    // *** removed next 3 in order to clean up redirect query string
    // grant_type: grantType,
    // scope: client.scope,
    // auth_time: Math.floor(authTime.valueOf() / 1000)
  };
  db.accessTokens.save(token, expiration, user.id, client.id, areq.tokenScope, grantType, authTime)
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
  if (config.oauth2.disableCodeGrant) {
    const err = new Error('grant_type code (code grant) is disabled');
    return done(err);
  }

  const responseParams = {
    expires_in: config.token.expiresIn,
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
    // Check if password grant is disabled in the config
    if (config.oauth2.disablePasswordGrant) {
      const err = new Error('grant_type password (password grant) is disabled');
      return done(err);
    }
    const responseParams = {
      expires_in: config.token.expiresIn,
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
 * For client credentials, there is no user authenticaiton involved with this transation.
 * Therefore the scope is based solely on the request and client definition.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - the `scope` submitted in the authorization request.
 */
server.exchange(oauth2orize.exchange.clientCredentials((client, scope, body, authInfo, done) => {
  // Check if client_credentials grant is disabled in the config
  if (config.oauth2.disableClientGrant) {
    const err = new Error('grant_type client_credentials (client grant) is disabled');
    return done(err);
  }

  // Compile token scope
  const tokenScope = intersectReqCliScopes(scope, client.allowedScope);
  const token = utils.createToken({ sub: client.id, exp: config.token.expiresIn });
  const expiration = new Date(Date.now() + (config.token.expiresIn * 1000));
  const authTime = new Date();
  const grantType = 'client_credentials';
  const responseParams = {
    expires_in: config.token.expiresIn,
    scope: tokenScope,
    grantType: grantType,
    auth_time: Math.floor(authTime.valueOf() / 1000)
  };

  //
  // Pass in a null for user id since there is no user when using this grant type
  db.accessTokens.save(token, expiration, null, client.id, tokenScope, grantType, authTime)
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
 * The scope used to create the replacement access_token is retrived from the
 * refresh_token record in the database.
 */
server.exchange(oauth2orize.exchange.refreshToken(
  (client, refreshToken, scope, body, authInfo, done) => {
    // Check if refresh_token grant is disabled in the config
    if (config.oauth2.disableRefreshTokenGrant) {
      const err = new Error('grant_type refresh_token (Refresh token grant) is disabled');
      return done(err);
    }
    console.log();
    console.log('TODO: oauthorize.exchange.refreshToken not need client auth');
    console.log();
    const responseParams = {
      expires_in: config.token.expiresIn,
      grant_type: 'refresh_token'
    };
    db.refreshTokens.find(refreshToken)
      .then((foundRefreshToken) => validate.refreshToken(foundRefreshToken, refreshToken, client))
      .then((foundRefreshToken) => {
        responseParams.scope = foundRefreshToken.scope;
        responseParams.auth_time = foundRefreshToken.authTime;
        // replace "authorization_code" with "refresh_token"
        foundRefreshToken.grantType = 'refresh_token';
        return validate.generateToken(foundRefreshToken);
      })
      // See above: done(err, accessToken, refreshToken, params)
      .then((token) => done(null, token, null, responseParams))
      .catch(() => done(null, false));
  }
));

/*
 * User authorization endpoint
 *
 * `authorization` middleware accepts a `validate` callback which is
 * responsible for validating the client making the authorization request.  In
 * doing so, the `redirectURI` be checked against a registered value included
 * in the client record, although security requirements may vary accross
 * implementations.  Once validated, the `done` callback must be invoked with
 * a `client` instance, as well as the `redirectURI` to which the user will be
 * redirected after an authorization decision is obtained.
 *
 * This middleware simply initializes a new authorization transaction.  It is
 * the application's responsibility to authenticate the user and render a dialog
 * to obtain their approval (displaying details about the client requesting
 * authorization).  We accomplish that here by routing through `ensureLoggedIn()`
 * first, and rendering the `dialog` view.
 *
 * At this step, the scope of the requsted token is formed.
 * The scope is the intersection of -
 *    - requesting client's `allowedScope`,
 *    - requesting user's `role`
 *    - the `scope` submitted in the authorization request.
 * The intersected scope is saved to `req.oauth2.req.tokenScope` and it
 * will be used later to be saved with the authorization code
 * and subsequently used during exchange of code for token.
 */
exports.authorization = [
  login.ensureLoggedIn(),
  inputValidation.dialogAuthorization,
  server.authorization({ idLength: config.decision.idLength },
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
        if (client != null && client.trustedClient && client.trustedClient === true) {
          // This is how we short call the decision like the dialog below does
          server.decision({ loadTransaction: false }, (serverReq, callback) => {
            // o2authorize parse function callback (err, ares, locals)
            callback(null, { allow: true });
          })(req, res, next);
        } else {
          res.render('dialog', {
            transactionID: req.oauth2.transactionID,
            user: req.user,
            client: req.oauth2.client,
            scopeString: toScopeString(req.oauth2.req.tokenScope)
          });
        }
      })
      .catch(() =>
        res.render('dialog', {
          transactionID: req.oauth2.transactionID,
          user: req.user,
          client: req.oauth2.client
        })
      );
  },
  // This handler remove the transaction from session
  server.authorizationErrorHandler(),
  // This handler detect error and handles proper message
  server.errorHandler()
];

/**
 * User decision endpoint
 *
 * `decision` middleware processes a user's decision to allow or deny access
 * requested by a client application.  Based on the grant type requested by the
 * client, the above grant middleware configured above will be invoked to send
 * a response.
 */
// To cancel decision, form should post body with cancel: 'Deny'
//  body: {
//    "transaction_id": "xxxxxxxxx",
//    "cancel": "Deny"
//  }
exports.decision = [
  login.ensureLoggedIn(),
  server.decision(),
  // This handler remove the transaction from session
  server.authorizationErrorHandler(),
  // This handler detect error and handles proper message
  server.errorHandler()
];

/**
 * Token endpoint
 *
 * `token` middleware handles client requests to exchange authorization grants
 * for access tokens.  Based on the grant type being exchanged, the above
 * exchange middleware will be invoked to handle the request.  Clients must
 * authenticate when making requests to this endpoint.
 *
 * Client credentials may be either Basic with base64 encoded Basic Authorizatin header,
 * or client_id and client_secret in body of request. Either will work.
 */
exports.token = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  inputValidation.oauthToken,
  server.token(),
  server.errorHandler()
];

// Register serialialization and deserialization functions.
//
// When a client redirects a user to user authorization endpoint, an
// authorization transaction is initiated.  To complete the transaction, the
// user must authenticate and approve the authorization request.  Because this
// may involve multiple HTTPS request/response exchanges, the transaction is
// stored in the session.
//
// An application must supply serialization functions, which determine how the
// client object is serialized into the session.  Typically this will be a
// simple matter of serializing the client's ID, and deserializing by finding
// the client by ID from the database.

server.serializeClient((client, done) => done(null, client.id));

server.deserializeClient((id, done) => {
  db.clients.find(id)
    .then((client) => done(null, client))
    .catch((err) => done(err));
});
