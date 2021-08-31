//
// Miscellaneous utilites to help debugging, moved here to clean up app.js
// -----------------------------------------------------------------------
'use strict';

const debuglog = global.debuglog || false;

const express = require('express');
const router = express.Router();

// --------------------------------------
// This function is debugging to console.log
// various items from request object for each request
// --------------------------------------
const logStuff = (req, res, next) => {
  // console.log(' -----------------------------------');
  // console.log(req.method + ' ' + req.url);
  // if (Object.keys(req.query).length > 0) {
  //   console.log('Query: ' + JSON.stringify(req.query));
  // }
  // console.log('rawHeaders: ' + JSON.stringify(req.rawHeaders, null, 2));
  console.log('Headers: ' + JSON.stringify(req.headers, null, 2));
  // if (Object.keys(req.cookies).length > 0) {
  //   console.log('cookies \n' + JSON.stringify(req.cookies, null, 2));
  // }
  // if ((req.signedCookies) && (Object.keys(req.signedCookies).length > 0)) {
  //   console.log('Signed cookies \n' + JSON.stringify(req.signedCookies, null, 2));
  // }
  // console.log('SessionID ' + req.sessionID);
  // console.log('session \n' + JSON.stringify(req.session, null, 2));
  // if (req.method === 'POST') {
  //   console.log('body');
  //   console.log(JSON.stringify(req.body));
  // }
  next();
};

// --------------------------------------------------------------
// This is debugging middleware that can show session contents
// during each step of oauth negotiations
// --------------------------------------------------------------
const logsession = (req, res, next) => {
  if (!debuglog) {
    return next();
  }
  if (!req.session) {
    console.log('logsession: req.session not found');
    return next();
  } else {
    console.log('|----------------|');
    console.log('logsession (before):' + req.method + ' ' + req.url);
    console.log('    session: ' + JSON.stringify(req.session, null, 2));
    if (req.authInfo) {
      console.log('    req.authInfo: ' + JSON.stringify(req.authInfo, null, 2));
    }
    // if ((req.headers) && (req.headers.authorization)) {
    //   console.log('    req.headers.authorization: ' + req.headers.authorization);
    // }
    if (req.oauth2) console.log('req.oauth2 ' + JSON.stringify(req.oauth2, null, 2));
    if (req.locals) console.log('req.locals ' + JSON.stringify(req.locals, null, 2));
    if ((req.body) && (Object.keys(req.body).length > 0)) {
      console.log('    body: ' + JSON.stringify(req.body, null, 2));
    }
    console.log('+----------------+');
    return next();
  }
};

// ------------------------------------------------------------
// Debug:  the route /debug will write the databases to console
// ------------------------------------------------------------
router.get('/debug', (req, res, next) => {
  if (debuglog) {
    // * * * token databases * * *
    const db = require('./db');
    db.authorizationCodes.debug();
    db.accessTokens.debug();
    db.refreshTokens.debug();

    // * * *  client/user databases * * *
    // db.clients.debug();
    // db.users.debug();
    // * * * session * * *
    // console.log('req.session\n' + JSON.stringify(req.session, null, 2));

    res.send('Done, use back arrow');
  } else {
    // if disabled, not found
    next();
  }
});

module.exports = {
  router,
  logStuff,
  logsession
};
