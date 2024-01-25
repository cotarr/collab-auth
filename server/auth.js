'use strict';

const db = require('./db');
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const { BasicStrategy } = require('passport-http');
const { Strategy: ClientPasswordStrategy } = require('passport-oauth2-client-password');
const validate = require('./validate');
const sessionAuth = require('./session-auth');
const { addScopeToPassportReqObj } = require('./scope');
const logUtils = require('./log-utils');
const stats = require('./stats');

// -----------------------------------------------------
// Part 1 of 2
// Local strategy for direct user login to web server
// -----------------------------------------------------

/**
 * LocalStrategy ('local')
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(new LocalStrategy({ passReqToCallback: true }, (req, username, password, done) => {
  db.users.findByUsername(username)
    .then((user) => validate.user(user, password))
    .then((user) => sessionAuth.addLoginTimestamp(req, user))
    .then((user) => db.users.updateLoginTime(user))
    .then((user) => logUtils.logPassportLocalLogin(req, user))
    .then((user) => stats.incrementCounterPm(user, 'userLogin'))
    .then((user) => done(null, user))
    .catch((err) => {
      stats.incrementCounterFn('failedLogin');
      logUtils.logPassportLocalError(req, err);
      return done(null, false);
    });
}));

// --------------------------------------------
// Part 2 of 2
// OAuth2 Strategies for server connections
// --------------------------------------------

/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * Basic Strategy ('basic')
 *
 * These strategies are used to authenticate registered OAuth clients.  They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens.  The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate.  Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header).  While this approach is not recommended by
 * the specification, in practice it is quite common.
 */
passport.use(new BasicStrategy({ passReqToCallback: true },
  (req, clientId, clientSecret, done) => {
    db.clients.findByClientId(clientId)
      .then((client) => validate.client(client, clientSecret))
      .then((client) => addScopeToPassportReqObj(req, client))
      .then((client) => done(null, client))
      .catch(() => done(null, false));
  }
));

/**
 * Client Password strategy ('oauth2-client-password')
 *
 * The OAuth 2.0 client password authentication strategy authenticates clients
 * using a client ID and client secret. The strategy requires a verify callback,
 * which accepts those credentials and calls done providing a client.
 */
passport.use(new ClientPasswordStrategy({ passReqToCallback: true },
  (req, clientId, clientSecret, done) => {
    db.clients.findByClientId(clientId)
      .then((client) => validate.client(client, clientSecret))
      .then((client) => addScopeToPassportReqObj(req, client))
      .then((client) => done(null, client))
      .catch(() => done(null, false));
  }
));

// Register serialization and deserialization functions.
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

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.users.find(id)
    .then((user) => done(null, user))
    .catch((err) => done(err));
});
