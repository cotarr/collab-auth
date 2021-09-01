'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const passport = require('passport');
const { requireScopeForWebPanel } = require('./scope');

// const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Render the login.ejs
 * @param   {Object} req - The request
 * @param   {Object} res - The response
 * @returns {undefined}
 */
exports.loginForm = (req, res, next) => {
  if (debuglog) console.log('site.loginForm (called)');
  res.render('login');
};
/**
 * redirectError an informational web page to inform the
 * user a `/login` was initiated without a valid redirectURL.
 */
exports.redirectError = [
  (req, res, next) => { if (debuglog) { console.log('site.redirectError (called)'); } next(); },
  ensureLoggedIn(),
  (req, res) => {
    res.render('redirecterror', { name: req.user.name });
  }
];

/**
 * Authenticate normal login page using strategy of authenticate
 * POST /login (credentials in body)
 */
exports.login = [
  (req, res, next) => { if (debuglog) { console.log('site.login (called)'); } next(); },
  passport.authenticate('local',
    { successReturnToOrRedirect: '/redirecterror', failureRedirect: '/login' }
  )
];

/**
 * Logout of the system and redirect to root
 * @param   {Object}   req - The request
 * @param   {Object}   res - The response
 * @returns {undefined}
 */
exports.logout = (req, res) => {
  if (debuglog) console.log('site.logout (called)');
  req.logout();
  // name empty string for header
  res.render('logout', { name: '' });
  // res.redirect('/');
};

/**
 * Change Password Forms
 *
 * Required scope: role=user.password or role=user.admin
 */
exports.changePassword = [
  ensureLoggedIn(),
  requireScopeForWebPanel(['user.password', 'user.admin']),
  (req, res, next) => {
    if ((req.query) && (req.query.cancel) && (req.query.cancel === 'yes')) {
      const message = 'Your password change request has been cancelled.';
      res.render('change-password-message', { name: req.user.name, passwordMessage: message });
    } else {
      res.render('change-password', { name: req.user.name, username: req.user.username });
    }
  }
];

/**
 * Change Password POST request handler
 *
 * Required scope: role=user.password or role=user.admin
 */
exports.changePasswordHandler = [
  ensureLoggedIn(),
  requireScopeForWebPanel(['user.password', 'user.admin']),
  (req, res, next) => {
    const message = 'Your password has been successfully changed. ';
    res.render('change-password-message', { name: req.user.name, passwordMessage: message });
  }
];
