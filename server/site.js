'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const login = require('connect-ensure-login');
const passport = require('passport');
const db = require('./db');

const config = require('./config/');
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
  // name empty string for header
  res.render('logout', { name: '' });
  // res.redirect('/');
};

const requireInfo = (req, res, next) => {
  if (!req.user) throw new Error('User record not found in request object');
  db.users.find(req.user.id)
    .then((user) => {
      if (!user) throw new Error('User record not found in user database');
      if ((user.role) && (Array.isArray(user.role)) && (req.user.role.length > 0)) {
        if (user.role.indexOf('user.info') >= 0) return next();
        if (user.role.indexOf('user.password') >= 0) return next();
        if (user.role.indexOf('user.admin') >= 0) return next();
      }
      return res.render('access-denied',
        { name: user.name, username: user.username, required: 'user.info' });
    })
    .catch((err) => {
      return next(err);
    });
};

const requirePassword = (req, res, next) => {
  if (!req.user) throw new Error('User record not found in request object');
  db.users.find(req.user.id)
    .then((user) => {
      if (!user) throw new Error('User record not found in user database');
      if ((user.role) && (Array.isArray(user.role)) && (req.user.role.length > 0)) {
        if (user.role.indexOf('user.password') >= 0) return next();
        if (user.role.indexOf('user.admin') >= 0) return next();
      }
      return res.render('access-denied',
        { name: user.name, username: user.username, required: 'user.password' });
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
  requireInfo,
  (req, res, next) => {
    let visibility = '';
    if (config.disableInMemoryDb) visibility = 'hidden';

    res.render('menu', { name: req.user.name, visibility: visibility });
  }
];

/**
 * Render account.ejs but ensure the user is logged in before rendering
 * @param   {Object}   req - The request
 * @param   {Object}   res - The response
 * @returns {undefined}
 */
exports.viewUser = [
  login.ensureLoggedIn(),
  requireInfo,
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
          // Example: /listuser?id=9158a0c0-85fc-4f7d-a9cf-328c5f4227b9
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
        return res.render('view-user', { name: req.user.name, user: user });
      })
      .catch((err) => {
        return next(err);
      });
  }
];

// Example: /listclient?id=9158a0c0-85fc-4f7d-a9cf-328c5f4227b9
// This requires user role: user.admin
exports.viewClient = [
  login.ensureLoggedIn(),
  requireAdmin,
  (req, res, next) => {
    if ((req.user.role) && (req.user.role.indexOf('user.admin') < 0)) {
      return res.render('access-denied',
        { name: req.user.name, required: 'user.admin' });
    }
    if ((!req.query) || (!req.query.id)) {
      // 404 not found
      return next();
    }
    db.clients.find(req.query.id)
      .then((client) => {
        if (!client) {
          // 404 not found
          return next();
        }
        return res.render('view-client', { name: req.user.name, aclient: client });
      })
      .catch((err) => {
        return next(err);
      });
  }
];

exports.changePassword = [
  login.ensureLoggedIn(),
  requirePassword,
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

exports.changePasswordHandler = [
  login.ensureLoggedIn(),
  requirePassword,
  (req, res, next) => {
    // console.log('req.body ', req.body);
    db.users.find(req.user.id)
      .then((user) => {
        if (!user) throw new Error('User record not found');
        return res.render('change-password-message', { name: req.user.name });
      })
      .catch((err) => {
        return next(err);
      });
  }
];

exports.listUsers = [
  login.ensureLoggedIn(),
  requireAdmin,
  (req, res, next) => {
    db.users.findAll()
      .then((userArray) => {
        return res.render('list-users', { name: req.user.name, users: userArray });
      })
      .catch((err) => {
        return next(err);
      });
  }
];
exports.listClients = [
  login.ensureLoggedIn(),
  requireAdmin,
  (req, res, next) => {
    db.clients.findAll()
      .then((clientArray) => {
        // console.log('clientArray ', clientArray);
        return res.render('list-clients', { name: req.user.name, clients: clientArray });
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
      res.render('generic-message', {
        name: req.user.name,
        title: 'Clear Auth',
        message: 'Access tokens, refresh tokens, and session data has been cleared'
      });
    } else {
      res.render('confirm-remove', { name: req.user.name });
    }
  }
];
