'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const login = require('connect-ensure-login');
const passport = require('passport');
const db = require('./db');

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
  login.ensureLoggedIn(),
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
  res.render('logout');
  // res.redirect('/');
};

const requireRead = (req, res, next) => {
  if (!req.user) throw new Error('User record not found in request object');
  db.users.find(req.user.id)
    .then((user) => {
      if (!user) throw new Error('User record not found in user database');
      if ((user.role) && (Array.isArray(user.role)) && (req.user.role.length > 0)) {
        if (user.role.indexOf('user.read') >= 0) return next();
        if (user.role.indexOf('user.write') >= 0) return next();
        if (user.role.indexOf('user.admin') >= 0) return next();
      }
      return res.render('access-denied',
        { name: user.name, username: user.username, required: 'user.read' });
    })
    .catch((err) => {
      return next(err);
    });
};

const requireWrite = (req, res, next) => {
  if (!req.user) throw new Error('User record not found in request object');
  db.users.find(req.user.id)
    .then((user) => {
      if (!user) throw new Error('User record not found in user database');
      if ((user.role) && (Array.isArray(user.role)) && (req.user.role.length > 0)) {
        if (user.role.indexOf('user.write') >= 0) return next();
        if (user.role.indexOf('user.admin') >= 0) return next();
      }
      return res.render('access-denied',
        { name: user.name, username: user.username, required: 'user.write' });
    })
    .catch((err) => {
      return next(err);
    });
};

const requireAdmin = (req, res, next) => {
  if (!req.user) throw new Error('User record not found in request object');
  db.users.find(req.user.id)
    .then((user) => {
      if (!user) throw new Error('User record not found in user database');
      if ((user.role) && (Array.isArray(user.role)) && (req.user.role.length > 0)) {
        if (user.role.indexOf('user.admin') >= 0) return next();
      }
      return res.render('access-denied',
        { name: user.name, username: user.username, required: 'user.admin' });
    })
    .catch((err) => {
      return next(err);
    });
};

exports.menu = [
  login.ensureLoggedIn(),
  requireRead,
  (req, res, next) => {
    res.render('menu', { name: req.user.name });
  }
];

/**
 * Render account.ejs but ensure the user is logged in before rendering
 * @param   {Object}   req - The request
 * @param   {Object}   res - The response
 * @returns {undefined}
 */
exports.account = [
  login.ensureLoggedIn(),
  requireRead,
  (req, res, next) => {
    db.users.find(req.user.id)
      .then((user) => {
        if (!user) throw new Error('User record not found (1)');
        if (!req.query) {
          return user;
        } else if ((req.query) && (Object.keys(req.query).length === 0)) {
          return user;
        } else if ((req.query) && (req.query.id) && (req.query.id === req.user.id)) {
          return user;
        } else if ((req.query) && (req.query.id)) {
          // Else case of lookup account of another user
          // Example: /account?id=9158a0c0-85fc-4f7d-a9cf-328c5f4227b9
          // This requires user role: user.admin
          if ((user.role) && (user.role.indexOf('user.admin') >= 0)) {
            return db.users.find(req.query.id);
          } else {
            return res.render('access-denied',
              { name: user.name, username: user.username, required: 'user.admin' });
          }
        } else {
          return null;
        }
      })
      .then((user) => {
        if (!user) throw new Error('User record not found (2)');
        let roleString = '';
        user.role.forEach((scope, i) => {
          if (i > 0) roleString += ', ';
          roleString += ' ' + scope.toString();
        });
        return res.render('account', { name: user.name, user: user, userScope: roleString });
      })
      .catch((err) => {
        return next(err);
      });
  }
];

exports.changePassword = [
  login.ensureLoggedIn(),
  requireWrite,
  (req, res, next) => {
    db.users.find(req.user.id)
      .then((user) => {
        if (!user) throw new Error('User record not found');
        return res.render('change-password', { name: user.name, username: user.username });
      })
      .catch((err) => {
        return next(err);
      });
  }
];

exports.editUser = [
  login.ensureLoggedIn(),
  requireAdmin,
  (req, res, next) => {
    db.users.findAll()
      .then((userArray) => {
        return res.render('list-edit-users', { name: req.user.name, users: userArray });
      })
      .catch((err) => {
        return next(err);
      });
  }
];

exports.removeAllTokens = [
  login.ensureLoggedIn(),
  requireAdmin,
  (req, res, next) => {
    if ((req.query) && (req.query.confirm) && (req.query.confirm === 'yes')) {
      db.accessTokens.removeAll();
      db.refreshTokens.removeAll();
      // This is only active for PostgreSQL
      db.sessions.removeAll();
      res.redirect('/menu');
    } else {
      res.render('confirm-remove', { name: req.user.name });
    }
  }
];
