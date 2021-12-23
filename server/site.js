'use strict';

const bcrypt = require('bcryptjs');
const config = require('./config');
const nodeEnv = process.env.NODE_ENV || 'development';

// NPM modules
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

// Custom modules
const db = require('./db');
const { requireScopeForWebPanel } = require('./scope');
const validate = require('./validate');
const inputValidation = require('./input-validation');
const logUtils = require('./log-utils');

// const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Render the login Form
 *
 * Previous failed login message added by ejs when query
 * parameter retry is yes, example: /login?retry=yes
 */
exports.loginForm = [
  inputValidation.loginGetRequest,
  csrfProtection,
  (req, res, next) => {
    const options = {
      csrfToken: req.csrfToken(),
      opt: {
        maxUnLen: config.data.userUsernameMaxLength,
        maxPwLen: config.data.userPasswordMaxLength
      }
    };
    if ((req.query) && (req.query.retry) && (req.query.retry === 'yes')) {
      options.opt.failMessage = 'Login failed. Try again.';
    }
    res.set('Cache-Control', 'no-store').render('login', options);
  }
];

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
 * Password submission rate limiter using express-rate-limit
 * Limit per IP address for POST request to /login
 * Successful request add to count.
 */
console.log(config.limits);
const passwordRateLimit = rateLimit({
  windowMs: config.limits.passwordRateLimitTimeMs,
  max: config.limits.passwordRateLimitCount,
  statusCode: 429,
  message: 'Too many requests',
  headers: false
});

/**
 * Authenticate normal login page using strategy of authenticate
 * POST /login (credentials in body)
 * Upon success return to saved URL, else show redirect error message.
 * Includes rate limiter, input validation, csrf token.
 */
exports.login = [
  passwordRateLimit,
  inputValidation.loginPostRequest,
  csrfProtection,
  passport.authenticate('local',
    { successReturnToOrRedirect: '/redirecterror', failureRedirect: '/login?retry=yes' }
  )
];

/**
 * Logout of the system and render logout info page
 */
exports.logout = (req, res, next) => {
  req.logout();
  return res.set('Cache-Control', 'no-store').render('logout', { name: '' });
};

/**
 * Validate password fields, then if PostgreSQL options, use bcrypt to hash password
 *
 * If error, throws error
 * Otherwise replace password in req.body
 */
const validateAndHashPassword = (req, res, user) => {
  if (req.body.newpassword1 !== req.body.newpassword2) {
    throw new Error('Passwords do not match');
  } else if ((req.body.newpassword1.length < config.data.userPasswordMinLength) ||
    (req.body.newpassword1.length > config.data.userPasswordMaxLength)) {
    throw new Error('Password invlid length');
  } else if (req.body.oldpassword === req.body.newpassword1) {
    throw new Error('New password same');
  } else {
    // Use bcrypt to hash password for PostgreSQL configuration
    if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
      // Else, in Memory storage, use Plain Text
      // Leave password unchanged in req.body
    } else {
      req.body.newpassword1 = bcrypt.hashSync(req.body.newpassword1, 10);
    }
  }
  // user is passed through unchanged
  return user;
};

/**
 * Change Password Form
 */
exports.changePassword = [
  ensureLoggedIn(),
  requireScopeForWebPanel(['user.password', 'user.admin']),
  csrfProtection,
  (req, res, next) => {
    if ((req.query) && (req.query.cancel) && (req.query.cancel === 'yes')) {
      const message = 'Your password change request has been cancelled.';
      res.set('Cache-Control', 'no-store').render('change-password-message',
        { name: req.user.name, passwordMessage: message });
    } else {
      res.set('Cache-Control', 'no-store').render('change-password',
        {
          csrfToken: req.csrfToken(),
          name: req.user.name,
          username: req.user.username,
          opt: {
            minPwLen: config.data.userPasswordMinLength,
            maxPwLen: config.data.userPasswordMaxLength
          }
        }
      );
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
  csrfProtection,
  inputValidation.changePassword,
  (req, res, next) => {
    validate.usernameMatchesSession(req, req.body.username)
      .then((username) => db.users.findByUsername(username))
      .then((user) => validate.user(user, req.body.oldpassword))
      .then((user) => db.users.updateLoginTime(user))
      .then((user) => validateAndHashPassword(req, res, user))
      .then((user) => db.users.updatePassword(user.id, req.body.newpassword1))
      .then((user) => validate.userExists(user))
      .then((user) => {
        logUtils.userLogActivity(req, user.username + ' changed password');
        const message = 'Your password has been successfully changed. ';
        res.set('Cache-Control', 'no-store').render('change-password-message',
          { name: req.user.name, passwordMessage: message });
      })
      .catch((e) => {
        // console.log(e.message);
        let message = 'Error changing password.';
        if (e.message === 'Not current user') {
          message = 'Username was Invalid';
        }
        if (e.message === 'User password not correct') {
          message = 'Old password was Invalid.';
        }
        if (e.message === 'Passwords do not match') {
          message = 'Passwords do not match.';
        }
        if (e.message === 'Password invlid length') {
          message = 'Password invlid length.';
        }
        if (e.message === 'New password same') {
          message = 'New password must be different.';
        }
        const options = {
          passwordMessage: message
        };
        res.set('Cache-Control', 'no-store').render('change-password-error', options);
      });
  }
];
