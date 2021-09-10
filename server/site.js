'use strict';

// NPM modules
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const passport = require('passport');

// Custom modules
const db = require('./db');
const { requireScopeForWebPanel } = require('./scope');
const validate = require('./validate');
const inputValidation = require('./input-validation');
const logUtils = require('./log-utils');

// const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Render the login Form
 */
exports.loginForm = (req, res, next) => {
  res.set('Cache-Control', 'no-store').render('login');
};
/**
 * redirectError an informational web page to inform the
 * user a `/login` was initiated without a valid redirectURL.
 */
exports.redirectError = [
  ensureLoggedIn(),
  (req, res) => {
    res.set('Cache-Control', 'no-store').render('redirecterror', { name: req.user.name });
  }
];

/**
 * Authenticate normal login page using strategy of authenticate
 * POST /login (credentials in body)
 */
exports.login = [
  inputValidation.loginRequest,
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
  res.set('Cache-Control', 'no-store').render('logout', { name: '' });
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
      res.set('Cache-Control', 'no-store').render('change-password-message',
        { name: req.user.name, passwordMessage: message });
    } else {
      res.set('Cache-Control', 'no-store').render('change-password',
        { name: req.user.name, username: req.user.username });
    }
  }
];

/**
 * Change Password POST request handler
 *
 * User password is for passport local Strategy
 *    req.body.username
 *    req.body.oldpassword
 *    req.body.newpassword1
 *    req.body.newpassword2
 */
exports.changePasswordHandler = [
  ensureLoggedIn(),
  requireScopeForWebPanel(['user.password', 'user.admin']),
  inputValidation.changePassword,
  (req, res, next) => {
    validate.usernameMatchesSession(req, req.body.username)
      .then((username) => db.users.findByUsername(username))
      .then((user) => validate.user(user, req.body.oldpassword))
      .then((user) => db.users.updateLoginTime(user))
      .then((user) => db.users.updatePassword(user.id, req.body.newpassword1))
      .then((user) => validate.userExists(user))
      .then((user) => {
        logUtils.userLogActivity(req, user.username + ' changed password');
        const message = 'Your password has been successfully changed. ';
        res.set('Cache-Control', 'no-store').render('change-password-message',
          { name: req.user.name, passwordMessage: message });
      })
      .catch((err) => {
        next(err);
      });
  }
];
