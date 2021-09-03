//
// Miscellaneous utilites to help debugging, moved here to clean up app.js
// -----------------------------------------------------------------------
'use strict';

/**
 * This function is debugging to console.log
 * various items from request object are
 * printed to the console log for debugging
 */

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

module.exports = {
  logStuff
};
