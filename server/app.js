'use strict';

// Node packages
const http = require('http');
const path = require('path');

// express/passport packages
const express = require('express');
const session = require('express-session');
const oauth2 = require('./oauth2');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const logger = require('morgan');
const helmet = require('helmet');

// Application custom modules
const db = require('./db');
const site = require('./site');
const adminPanel = require('./admin-panel');
const checkVhost = require('./check-vhost');
const logConfig = require('./log-config');
const securityContact = require('./security-contact');
const robotPolicy = require('./robot-policy');
const { checkSessionAuth } = require('./session-auth');
const config = require('./config');
const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production') {
  if (config.session.secret === 'A Secret That Should Be Changed') {
    console.error('Error, session secret must be changed for production');
    process.exit(1);
  }
  if (config.oauth2.clientSecretAesKey === 'A Secret That Should Be Changed') {
    console.error('Error, oauth2 client secret AES key must be changed for production');
    process.exit(1);
  }
  if (!(config.server.tls)) {
    console.error('Error, TLS is required for production');
    process.exit(1);
  }
}

// Express configuration
const app = express();
app.set('view engine', 'ejs');

// For login forms and admin editor forms
app.use(express.urlencoded({ extended: false }));
// For token APIs
app.use(express.json());

// ------------------
// HTTP access log
// ------------------
app.use(logger(logConfig.format, logConfig.options));

// ------------------------------
// Content Security Policy (CSP)
// ------------------------------
// -- Helmet CSP defaults v7.0.0 --
//
// default-src 'self';
// base-uri 'self';
// font-src 'self' https: data:;
// form-action 'self';
// frame-ancestors 'self';
// img-src 'self' data:;
// object-src 'none';
// script-src 'self';
// script-src-attr 'none';
// style-src 'self' https: 'unsafe-inline';
// upgrade-insecure-requests
// ------------------------------
const contentSecurityPolicy = {
  // Option to disable defaults
  useDefaults: false,
  // Custom CSP
  directives: {
    defaultSrc: ["'none'"],
    baseUri: ["'self'"],
    connectSrc: ["'self'"],
    imgSrc: ["'self'"],
    styleSrc: ["'self'"],
    frameAncestors: ["'none'"]
  },
  // Option to disable CSP while showing errors in console log.
  reportOnly: false
};

// ----------------------------------------
// HTTP Security Headers
// ----------------------------------------
// -- Helmet Default headers v7.0.0 --
//
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Resource-Policy: same-origin
// Origin-Agent-Cluster: ?1
// Referrer-Policy: no-referrer
// Strict-Transport-Security: max-age=15552000; includeSubDomains
// X-Content-Type-Options: nosniff
// X-DNS-Prefetch-Control: off
// X-Download-Options: noopen
// X-Frame-Options: SAMEORIGIN
// X-Permitted-Cross-Domain-Policies: none
// X-XSS-Protection: 0
// X-Powered-By: ( Removed by helmet)
// ----------------------------------------
app.use(helmet({
  xFrameOptions: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  contentSecurityPolicy: contentSecurityPolicy
}));

//
// Simple counter, visible in the admin editor at /panel/menu
// Useful to see normal usage and set firewall limit rules
//
app.use((req, res, next) => {
  global.counter.httpRequest++;
  next();
});

//
//   /status    Is the server alive?
//
app.get('/status', (req, res) => res.json({ status: 'ok' }));

// Route for security.txt
app.get('/.well-known/security.txt', securityContact);

// Route for robot policy
app.get('/robots.txt', robotPolicy);

//
// From this point, all requests must match domain name
//
if (nodeEnv === 'production') {
  app.use(checkVhost.rejectNotVhost);
}

// Edge case: IOS iPhone browser request to favicon.ico makes request without cookie.
// This unprotected route prevents an authorization redirect on favicon.ico requests.
app.get('/favicon.ico', function (req, res, next) {
  res.status(204).send(null);
});

//
// Routes that authenticate by Basic Auth for use of access_tokens
// are handled before the session middleware.
//
app.post('/oauth/token', oauth2.token);
app.post('/oauth/introspect', oauth2.introspect);
app.post('/oauth/token/revoke', oauth2.revoke);

// ----------------------------------------------------------
// Add fixed delay timer to the GET /login route.
// Workaround for PostgreSQL race condition, See comments in site.js
// ----------------------------------------------------------
app.get('/login', site.loginFormPreSessionDelay);

// -----------------------------------------------------------------
// express-session
// -----------------------------------------------------------------

const sessionOptions = {
  name: 'authorization.sid',
  proxy: false,
  rolling: config.session.rollingCookie,
  resave: false,
  saveUninitialized: false,
  secret: config.session.secret,
  cookie: {
    path: '/',
    maxAge: null,
    secure: (config.server.tls), // When TLS enabled, require secure cookies
    httpOnly: true,
    sameSite: 'Lax'
  }
};
// Session cookie clears when browser is closed.
if (config.session.notSessionCookie) {
  // express-session takes cookie.maxAge in milliseconds
  sessionOptions.cookie.maxAge = config.session.maxAge;
}

if (config.session.enablePgSessionStore) {
  // SQL queries
  // List:       SELECT sid, expire FROM session;
  // Clear all:  DELETE FROM session;
  console.log('Using PostgresSQL connect-pg-simple for session storage');
  // disable touch for fixed expiration cookie configuration
  const disableTouch = ((config.session.notSessionCookie === true) &&
    (config.session.rollingCookie === false));

  const pgPool = require('./db/pg-pool');
  const PgSessionStore = require('connect-pg-simple')(session);
  sessionOptions.store = new PgSessionStore({
    pool: pgPool,
    // connect-pg-simple ttl is in seconds
    ttl: config.session.ttl,
    tableName: 'session',
    // disable touch for fixed expiration cookie configuration
    disableTouch: disableTouch,
    // Connect-pg-simple takes prune time in seconds
    pruneSessionInterval: config.session.pruneInterval
  });
} else {
  console.log('Using memorystore for session storage');
  const MemoryStore = require('memorystore')(session);
  sessionOptions.store = new MemoryStore({
    // Memorystore ttl is in milliseconds
    ttl: config.session.maxAge,
    stale: false,
    // Memorystore takes prune time in milliseconds
    checkPeriod: config.session.pruneInterval * 1000
  });
}
app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
require('./auth');

// app.use((req, res, next) => {
//   console.log('isAuthenticated() ', req.isAuthenticated());
//   console.log('req.sessionID ', req.sessionID);
//   // console.log('req.session ', req.session);
//   next();
// });

app.get('/login', site.loginForm);
app.post('/login', site.login);
app.get('/redirecterror', site.redirectError);
app.get('/logout', site.logout);
app.get('/changepassword', site.changePassword);
app.post('/changepassword', site.changePasswordHandler);
app.get('/noscope', site.noScopePage);
app.get('/dialog/authorize', oauth2.authorization);
app.post('/dialog/authorize/decision', oauth2.decision);

// --------------------------------------------------
//   Admin Web site
//
//   Used to create and edit user and client records
// --------------------------------------------------
if (!config.database.disableWebAdminPanel) {
  app.use('/panel', adminPanel);
  console.log('Admin panel: Enabled');
} else {
  console.log('Admin panel: Disabled');
}

// ---------------------------------
// Secure link to challenge cookie
// ---------------------------------
app.get('/secure', checkSessionAuth(), (req, res) => {
  res.json({ authenticated: true });
});

// --------------------------------------
// Static Web server
//
// For: stylesheets, images, javascript files
//
// Public files do not require authentication
// --------------------------------------
app.use(express.static(path.join(__dirname, '../public')));
console.log('Serving static files from ' + path.join(__dirname, '../public'));

// ---------------------------------
//       T E S T   E R R O R
// ---------------------------------
// app.get('/error', (req, res, next) => { throw new Error('Test error'); });

// ---------------------------------
//    E R R O R   H A N D L E R S
// ---------------------------------
//
// catch 404 Not Found
//
app.use(function (req, res, next) {
  const err = new Error(http.STATUS_CODES[404]);
  err.status = 404;
  return res.set('Content-Type', 'text/plain').status(err.status).send(err.message);
});
//
// Custom error handler
//
app.use(function (err, req, res, next) {
  // per Node docs, if response in progress, must be returned to default error handler
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  let message = http.STATUS_CODES[status] || 'Unknown Error Occurred';
  if ((err.message) && (message !== err.message)) message += ', ' + err.message;
  message = 'Status: ' + status.toString() + ', ' + message;

  // Custom error response for csurf middleware
  if (err.code === 'EBADCSRFTOKEN') {
    console.log('Invalid csrf token');
    return res.status(403).send('Forbidden, invalid csrf token');
  }

  if (nodeEnv === 'production') {
    console.log(message);
    return res.set('Content-Type', 'text/plain').status(status).send(message);
  } else {
    console.log(err);
    return res.set('Content-Type', 'text/plain').status(status).send(message + '\n' + err.stack);
  }
});

// From time to time we need to clean up any expired tokens, and
// codes in the database
setInterval(() => {
  db.accessTokens.removeExpired()
    .catch((err) => console.error('Error trying to remove expired tokens:', err.stack));
  db.refreshTokens.removeExpired()
    .catch((err) => console.error('Error trying to remove expired refreshTokens:', err.stack));
  db.authorizationCodes.removeExpired()
    .catch((err) => console.error('Error trying to remove expired authorization codes', err.stack));
}, config.database.timeToCheckExpiredTokensSeconds * 1000);

module.exports = app;
