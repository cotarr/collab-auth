'use strict';

const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const passport = require('passport');
const { requireScopeForWebPanel } = require('./scope');

// const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Render the login Form
 */
exports.loginForm = (req, res, next) => {
  res.render('login');
};
/**
 * redirectError an informational web page to inform the
 * user a `/login` was initiated without a valid redirectURL.
 */
exports.redirectError = [
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
  passport.authenticate('local',
    { successReturnToOrRedirect: '/redirecterror', failureRedirect: '/login' }
  )
];

/**
 * Logout of the system and redirect logout info page
 */
exports.logout = (req, res) => {
  req.logout();
  // name empty string for header
  res.render('logout', { name: '' });
  // res.redirect('/');
};

/**
 * Change Password Form
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
 */
exports.changePasswordHandler = [
  ensureLoggedIn(),
  requireScopeForWebPanel(['user.password', 'user.admin']),
  (req, res, next) => {
    const message = 'Your password has been successfully changed. ';
    res.render('change-password-message', { name: req.user.name, passwordMessage: message });
  }
];
