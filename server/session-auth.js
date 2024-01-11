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
// In the case where the path (like '/hello') is added to the list of allowed paths
// in loginRedirectRoutes array, the URL will be saved into the user's session.
// A 302 redirect will send the user's browser to the GET /login,
// the password entry form. The passport middleware will use this
// value as the redirect URL after successful password entry.
//
// If the URL path is not in the loginRedirectRoutes array,
// a 401 Unauthorized response will be returned.
//
// This module has a middleware function to store a session expiration timestamp
// to the user's session. Expired requests will be denied except when
// configured for SESSION_SET_ROLLING_COOKIE=true.
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
// These routes redirect back to the original route
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
 * Middleware function to add session expiration time
 * in milliseconds to session record.
 * This is called from POST /login (password entry)
 * @param {Object} req - ExpressJs request object
 * @param {Object} res - ExpressJs response object
 * @param {Function} next - ExpressJs function to call next handler
 */
exports.updateSessionExpireTime = function (req, res, next) {
  if (req.session) {
    if (!req.session.sessionExpiresMs) {
      req.session.sessionExpiresMs = Date.now() + config.session.maxAge;
    }
  };
  next();
};

/**
 * Authorization middleware using passport to validate sessions
 * @param {Object} options - Function options argument
 * @param {String} options.failRedirectTo - Alternate 302 redirect
 */
exports.checkSessionAuth = function (options) {
  return function (req, res, next) {
    let expired = false;

    if (req.session.cookie) {
      // For case of rolling cookies skip this block
      if (!config.session.rollingCookie) {
        // For case of session cookie, or fixed expiration cookie
        // deny requests that exceed maxAge of session
        if (req.session.sessionExpiresMs) {
          const timeNowMs = Date.now();
          if (timeNowMs > req.session.sessionExpiresMs) {
            expired = true;
          }
        }
      }
    }
    //
    // Case of not authorized, for valid routes redirect /login, else return status 401
    //
    if ((expired) || (!req.isAuthenticated || (!req.isAuthenticated()))) {
      // Case of original URL is found is list of allowed redirect /login URLs
      if ((req.method) && (req.method.toUpperCase() === 'GET') &&
      (req._parsedOriginalUrl) && (req._parsedOriginalUrl.pathname) &&
      (loginRedirectRoutes.indexOf(req._parsedOriginalUrl.pathname) >= 0)) {
        if (req.session) {
          // Remember original URL in session, used by passport redirect after successful login
          req.session.returnTo = req.originalUrl || req.url;
        }
        // Redirect browser to load the login form
        if (req._parsedOriginalUrl.pathname !== '/login') {
          return res.redirect('/login');
        } else {
          const error = new Error('Circular routing aborted');
          error.status = 500;
          return next(error);
        }
      } else {
        // Case of not on list for redirect to /login.
        // Check if custom redirect URL was provided
        if ((options) && (options.failRedirectTo) && (options.failRedirectTo.length > 0) &&
          (allowedAlternateRedirectRoutes.indexOf(options.failRedirectTo) >= 0)) {
          // Case of URL supplied to function when called, and URL is in allowed list.
          return res.redirect(options.failRedirectTo);
        } else {
          // Not redirect to /login, not redirect to custom URL,
          // therefore reject response as 401 Unauthorized.
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
