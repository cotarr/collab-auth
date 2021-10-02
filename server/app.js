'use strict';

// Node packages
const http = require('http');
const path = require('path');

// express/passport packages
const express = require('express');
const session = require('express-session');
const oauth2 = require('./oauth2');
const passport = require('passport');
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
}

// Express configuration
const app = express();
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ------------------
// HTTP access log
// ------------------
app.use(logger(logConfig.format, logConfig.options));

// ---------------
// clean headers
// ---------------
app.use(helmet({
  hidePoweredBy: false
}));
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
// ----------------------------------------
// CSP Content Security Policy
// ----------------------------------------
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives:
    {
      defaultSrc: ["'none'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'"],
      mediaSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'self'"]
    }
}));

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

// -----------------------------------------------------------------
// express-session
// -----------------------------------------------------------------

const sessionOptions = {
  name: 'authorization.sid',
  proxy: false,
  rolling: true,
  secret: config.session.secret,
  cookie: {
    path: '/',
    // express-session takes cookie.maxAge in milliseconds
    maxAge: config.session.maxAge,
    secure: (config.server.tls), // When TLS enabled, require secure cookies
    httpOnly: true,
    // sameSite: 'Lax'
    sameSite: 'Strict'
  }
};

const sessionStore = {};
if (config.session.disableMemorystore) {
  // SQL queries
  // List:       SELECT sid, expire FROM session;
  // Clear all:  DELETE FROM session;
  console.log('Using PostgresSQL connect-pg-simple for session storage');
  sessionOptions.resave = false;
  sessionOptions.saveUninitialized = false;
  sessionStore.pgPool = require('./db/pg-pool');
  sessionStore.PgSessionStore = require('connect-pg-simple')(session);
  sessionOptions.store = new sessionStore.PgSessionStore({
    pool: sessionStore.pgPool,
    // connect-pg-simple ttl is in seconds
    ttl: config.session.ttl,
    tableName: 'session'
  });
} else {
  console.log('Using memorystore for session storage');
  sessionOptions.resave = false; // need false for memorystore
  sessionOptions.saveUninitialized = false; // need false for memorystore
  sessionStore.MemoryStore = require('memorystore')(session);
  sessionOptions.store = new sessionStore.MemoryStore({
    // Memorystore ttl is in milliseconds
    ttl: config.session.maxAge,
    stale: true,
    checkPeriod: 86400000 // prune every 24 hours
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
app.get('/dialog/authorize', oauth2.authorization);
app.post('/dialog/authorize/decision', oauth2.decision);
app.post('/oauth/token', oauth2.token);
app.post('/oauth/introspect', oauth2.introspect);
app.post('/oauth/token/revoke', oauth2.revoke);
app.post('/changepassword', site.changePasswordHandler);

// --------------------------------------------------
//   Admin Web site
//
//   Used to create and edit user and client records
// --------------------------------------------------
if (!config.database.disableWebAdminPanel) {
  app.use('/panel', adminPanel);
}

// ---------------------------------
// Secure link to challenge cookie
// ---------------------------------
app.get('/secure', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true });
  } else {
    res.set('Content-Type', 'text/plain').status(401).send('Unauthorized');
  }
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
