'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

// Node packages
const http = require('http');
const path = require('path');

// express/passport packages
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const session = require('express-session');
const login = require('connect-ensure-login');
const oauth2 = require('./oauth2');
const passport = require('passport');
const logger = require('morgan');
const helmet = require('helmet');

// Application custom modules
const db = require('./db');
const site = require('./site');
const token = require('./token');
const checkVhost = require('./check-vhost');
const debugUtils = require('./debug-utils').router;
const logsession = require('./debug-utils').logsession;

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

app.get('/login', logsession, site.loginForm);
app.post('/login', logsession, site.login);
app.get('/redirecterror', logsession, site.redirectError);
app.get('/logout', logsession, site.logout);

app.get('/dialog/authorize', logsession, oauth2.authorization);
app.post('/dialog/authorize/decision', logsession, oauth2.decision);
app.post('/oauth/token', logsession, oauth2.token);
app.post('/oauth/introspect', logsession, token.introspect);
app.post('/token/revoke', logsession, token.revoke);

// Secure link to challenge cookie
app.get('/secure', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true });
  } else {
    res.set('Content-Type', 'text/plain').status(401).send('Unauthorized');
  }
});

// Temporary debug utilities
if (nodeEnv === 'development') {
  app.use(debugUtils);
}

// ----------------
//    Web site
// ----------------
app.get('/menu', site.menu);
app.get('/account', site.account);
app.get('/changepassword', site.changePassword);
app.get('/listeditusers', site.editUser);
app.get('/removealltokens', site.removeAllTokens);

app.post('/changepassword', login.ensureLoggedIn(), (req, res, next) => {
  // not implemented yet, fall through to 404
  res.next();
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
  if (debuglog) console.log('Pruning at ' + new Date().toISOString());
  db.accessTokens.removeExpired()
    .then((data) => {
      if (debuglog) console.log('    deleted ' + data.rows.length + ' access-tokens');
    })
    .catch((err) => console.error('Error trying to remove expired tokens:', err.stack));
  db.refreshTokens.removeExpired()
    .then((data) => {
      if (debuglog) console.log('    deleted ' + data.rows.length + ' refresh-tokens');
    })
    .catch((err) => console.error('Error trying to remove expired refreshTokens:', err.stack));
  db.authorizationCodes.removeExpired()
    .catch((err) => console.error('Error trying to remove expired authorization codes', err.stack));
}, config.db.timeToCheckExpiredTokens * 1000);

module.exports = app;
