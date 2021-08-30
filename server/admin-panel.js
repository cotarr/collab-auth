'use strict';

const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const db = require('./db');
const { requireScopeForWebPanel } = require('./scope');

const config = require('./config/');
// const nodeEnv = process.env.NODE_ENV || 'development';

exports.menu = [
  ensureLoggedIn(),
  requireScopeForWebPanel(['user.password', 'user.admin']),
  (req, res, next) => {
    let visibility = '';
    if (config.disableInMemoryDb) visibility = 'hidden';

    db.users.find(req.user.id)
      .then((user) => {
        if ((user) && (user.role) && (user.role.indexOf('user.admin') >= 0)) {
          res.render('menu-admin', { name: req.user.name, visibility: visibility });
        } else {
          res.render('menu-user', { name: req.user.name, visibility: visibility });
        }
      })
      .catch((err) => {
        return next(err);
      });
  }
];

exports.viewUser = [
  ensureLoggedIn(),
  requireScopeForWebPanel(['user.password', 'user.admin']),
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
            return res.status(403).send('Status 403, Forbidden, Required scope not in user role');
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
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
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

exports.listUsers = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
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
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
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
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((req.query) && (req.query.confirm) && (req.query.confirm === 'yes')) {
      db.accessTokens.removeAll();
      db.refreshTokens.removeAll();
      // This is only active for PostgreSQL
      db.sessions.removeAll();
      res.render('generic-message', {
        name: req.user.name,
        title: 'Clear Auth',
        message: 'Access tokens and refresh tokens have been removed form the database.  Authorization server session data has been cleared'
      });
    } else {
      res.render('confirm-remove', { name: req.user.name });
    }
  }
];
