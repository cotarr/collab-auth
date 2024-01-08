// session-auth.js
//
// This is an authorization middleware intended for web browser requests
// that are authorized with the browser's cookie included in the cookie header.
// It uses the isAuthenticated() function that is attached to the express 'req' object
// by the passport middleware.
//
// Example:
//
// app.get('/hello', checkSessionAuth(), renderPage)
//
// In the case where the path '/hello' is added to the list of allowed paths
// in loginRedirectRoutes array, the URL will be saved into the user's session.
// A 302 redirect will send the user's browser to the GET /login,
// the password entry form. The passport middleware will use this
// value as the redirect URL after successful password entry.
//
// If the URL path is not in the loginRedirectRoutes array,
// a 401 Unauthorized response will be returned.
//
// The unique feature in this module is to store the original expiration
// time of the cookie in the user's session, so that expired requests will
// be denied independent of the session record ttl (See CHANGELOG v0.0.21).
// This expiration time feature is only applicable to fixed expiration cookies
// where SESSION_NOT_SESSION_COOKIE=true and SESSION_SET_ROLLING_COOKIE=false
//
'use strict';

const config = require('./config');

//
// Only these routes will redirect (302) to "/login", else status 401
//
// One of the considerations here is that saving the returnTo route
// modifies the session, causing a new session to be saved to the session store.
// By implementing a list, any requests to protected routes that are
// not on the list will prevent saving a new session to the session store.
//
// Note: if set DATABASE_DISABLE_WEB_ADMIN_PANEL=true, the admin
// panel pages will return 404 Not Found without authorization check.
//
// Other admin panel routes, such as /panel/edituser/, were not
// included, because an authorization failure in the middle of editing
// an input form should not be allowed to resume, forcing the user
// to start a new edit, reloading  fresh form at the main menu.
//
// Routes such as /panel/stats could be bookmarked. When requested from a
// browser bookmark, the original page would redirect after /login.
//
// -------------------------------------------------
// These routes redirect back to the original router
// after successful login with username and password.
// ---------------------------------------------------
const loginRedirectRoutes = [
  '/dialog/authorize',
  '/changepassword',
  '/panel/menu',
  '/panel/listusers',
  '/panel/viewuser',
  '/panel/listclients',
  '/panel/viewclient',
  '/panel/stats'
];

//
// Routes listed in the allowedAlternateRedirectRoutes will be allowed
// to immediately redirect to path name arguments to the checkSessionAuth() function.
// The route must be an argument of the checkSessionAuth() function and
// be included in the allowedAlternateRedirectRoutes array.
//
//    Example:
//
//    app.get('/somewhere', checkSessionAuth('/error-message.html'), renderPage);
//
const allowedAlternateRedirectRoutes = [
  '/panel/unauthorized'
];

/**
 * Authorization middleware using passport to validate sessions
 * @param {String} failRedirectTo - String containing the redirect route
 * @returns Express next() handler, or returns res object
 */
module.exports = function (options) {
  return function (req, res, next) {
    let expired = false;
    if ((req.session.cookie) && (req.session.passport)) {
      //
      // for case of rolling cookies or session cookies, skip this block and
      // let the session store expire and prune as needed.
      // For the case of cookies that expire, independent of the session store,
      // deny requests that exceed expiration of original cookie
      //
      if (!config.session.rollingCookie) {
        if (!req.session.cookieFirstExpire) {
          req.session.cookieFirstExpire = req.session.cookie._expires;
        } else {
          const timeNow = new Date();
          const timeExpire = new Date(req.session.cookieFirstExpire);
          if (timeNow > timeExpire) {
            expired = true;
            delete req.session.passport;
            // holds /dialog/authorize/decision transaction code
            delete req.session.authorize;
          }
        }
      }
    }
    //
    // Case of not authorized, for valid routes redirect /login, else return status 401
    //
    if ((expired) || (!req.isAuthenticated || (!req.isAuthenticated()))) {
      if ((req.method) && (req.method.toUpperCase() === 'GET') &&
        (req._parsedOriginalUrl) && (req._parsedOriginalUrl.pathname) &&
        (loginRedirectRoutes.indexOf(req._parsedOriginalUrl.pathname) >= 0)) {
        if (req.session) {
          req.session.returnTo = req.originalUrl || req.url;
        }
        if (req._parsedOriginalUrl.pathname !== '/login') {
          return res.redirect('/login');
        } else {
          const error = new Error('Circular routing aborted');
          error.status = 500;
          return next(error);
        }
      } else {
        if ((options) && (options.failRedirectTo) && (options.failRedirectTo.length > 0) &&
          (allowedAlternateRedirectRoutes.indexOf(options.failRedirectTo) >= 0)) {
          return res.redirect(options.failRedirectTo);
        } else {
          return res.status(401).send('Unauthorized');
        }
      }
    }
    //
    // Case of authorized, process request
    //
    return next();
  };
};
