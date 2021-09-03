'use strict';

// Node packages
const http = require('http');
const path = require('path');

// express/passport packages
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const session = require('express-session');
// const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const oauth2 = require('./oauth2');
const passport = require('passport');
const logger = require('morgan');
const helmet = require('helmet');

// Application custom modules
const db = require('./db');
const site = require('./site');
const adminPanel = require('./admin-panel');
const token = require('./token');
const checkVhost = require('./check-vhost');

const config = require('./config');
const nodeEnv = process.env.NODE_ENV || 'development';

// Express configuration
const app = express();
app.set('view engine', 'ejs');
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//
// HTTP access log
//
console.log('Access log: (console)');
const logFormat = ':date[iso] :remote-addr :status :method :http-version :req[host]:url';
const logOptions = {};
app.use(logger(logFormat, logOptions));

// ------------------
// debug logging
// ------------------
// const logStuff = require('./debug-utils').logStuff;
// app.use(logStuff);

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
  directives:
    {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'"],
      mediaSrc: ["'none'"],
      imgSrc: ["'self'"]
    }
}));

//
//   /status    Is the server alive?
//
app.get('/status', (req, res) => res.json({ status: 'ok' }));

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
    ttl: config.session.ttl,
    tableName: 'session'
  });
} else {
  console.log('Using memorystore for session storage');
  sessionOptions.resave = false; // need false for memorystore
  sessionOptions.saveUninitialized = false; // need false for memorystore
  sessionStore.MemoryStore = require('memorystore')(session);
  sessionOptions.store = new sessionStore.MemoryStore({
    // milliseconds
    ttl: config.session.maxAge,
    stale: true,
    checkPeriod: 864000000 // prune every 24 hours
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

app.get('/dialog/authorize', oauth2.authorization);
app.post('/dialog/authorize/decision', oauth2.decision);
app.post('/oauth/token', oauth2.token);
app.post('/oauth/introspect', token.introspect);
app.post('/token/revoke', token.revoke);

// ----------------
// Change Password
// ----------------
app.get('/changepassword', site.changePassword);
app.post('/changepassword', site.changePasswordHandler);

// --------------------------------------------------
//   Admin Web site
//
//   Used to create and edit user and client records
// --------------------------------------------------
app.use('/panel', adminPanel);

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
app.use('/error', (req, res, next) => { throw new Error('Test error'); });

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
}, config.db.timeToCheckExpiredTokens * 1000);

module.exports = app;
