'use strict';

const uid2 = require('uid2');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const db = require('./db');
const { requireScopeForWebPanel } = require('./scope');

const config = require('./config/');
// const nodeEnv = process.env.NODE_ENV || 'development';

/**
 * Admin menu endpoint
 *
 * The admin menu call the remaining functions in this module
 * to manage the user records and client records in the database.
 * The pages are simple server side forms.
 * Password authentication is required with user role = user.admin
 */

exports.menu = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    // Warning message if running Memory Store RAM database
    let visibility = '';
    if (config.database.disableInMemoryDb) visibility = 'hidden';
    res.render('menu-admin', { name: req.user.name, visibility: visibility });
  }
];
/**
 * List users endpoint
 */
exports.listUsers = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    db.users.findAll()
      .then((userArray) => {
        const filteredArray = [];
        userArray.forEach((user, i) => {
          const filteredUser = {
            id: user.id,
            username: user.username,
            name: user.name
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toISOString();
          } else {
            filteredUser.lastLogin = '';
          }
          filteredArray.push(filteredUser);
        });
        return res.render('list-users', { name: req.user.name, users: filteredArray });
      })
      .catch((err) => {
        return next(err);
      });
  }
];
/**
 * View user record endpoint
 *
 * User record ID is passed as a GET query paraeter
 */
exports.viewUser = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.users.find(req.query.id)
        .then((user) => {
          if (user == null) {
            const err = new Error('Invalid Id parameter');
            err.status = 400;
            return next(err);
          }
          const filteredUser = {
            id: user.id,
            username: user.username,
            name: user.name,
            loginDisabled: user.loginDisabled,
            role: user.role,
            updatedAt: user.updatedAt.toISOString(),
            createdAt: user.createdAt.toISOString()
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toISOString();
          } else {
            filteredUser.lastLogin = '';
          }
          return res.render('view-user', { name: req.user.name, user: filteredUser });
        })
        .catch((err) => {
          return next(err);
        });
    } else {
      const err = new Error('Invalid query parameters');
      err.status = 400;
      next(err);
    }
  }
];

/**
 * Create new user record endpoint
 */
exports.createUser = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    const defaultUser = {
      password: uid2(config.database.defaultUser.randomPasswordLength),
      role: config.database.defaultUser.role
    };
    return res.render('create-user', { name: req.user.name, defaultUser: defaultUser });
  }
];

/**
 * Create new user POST request handler
 */
exports.createUserHandler = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    console.log(req.body);
    return res.redirect('/panel/listusers');
  }
];

/**
 * Edit user record endpoint
 *
 * User ID is passed as a GET request URL query parameter
 */
exports.editUser = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.users.find(req.query.id)
        .then((user) => {
          if (user == null) {
            const err = new Error('Invalid Id parameter');
            err.status = 400;
            return next(err);
          }

          const filteredUser = {
            id: user.id,
            username: user.username,
            name: user.name,
            loginDisabled: user.loginDisabled,
            role: user.role,
            updatedAt: user.updatedAt.toISOString(),
            createdAt: user.createdAt.toISOString()
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toISOString();
          } else {
            filteredUser.lastLogin = '';
          }
          if (user.disabled) {
            filteredUser.disabled = 'checked';
          } else {
            filteredUser.disabled = '';
          }
          let scopeString = '';
          user.role.forEach((scope, i) => {
            if (i > 0) scopeString += ', ';
            scopeString += scope.toString();
          });
          filteredUser.role = scopeString;
          return res.render('edit-user', { name: req.user.name, user: filteredUser });
        })
        .catch((err) => {
          return next(err);
        });
    } else {
      const err = new Error('Invalid query parameters');
      err.status = 400;
      next(err);
    }
  }
];

/**
 * Edit user POST request handler
 */
exports.editUserHandler = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    console.log(req.body);
    return res.redirect('/panel/listusers');
  }
];

/**
 * Delete user record endpoint
 *
 * The ID is passed in as a GET request URL query parameter
 *
 * First call (query: id) lookup id, then render confirmation screen
 * Second call (query: id, confirmation='yes'), delete the record
 * Otherwise throw HTTP error
 */
exports.deleteUser = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.users.find(req.query.id)
        .then((user) => {
          if (user == null) {
            const err = new Error('Invalid id parameter');
            err.status = 400;
            return next(err);
          }
          return res.render('confirm-delete-user', { name: req.user.name, deleteId: req.query.id });
        })
        .catch((err) => next(err));
    } else if ((req.query) && (Object.keys(req.query).length === 2) &&
      ('id' in req.query) && (req.query.confirm) && (req.query.confirm === 'yes')) {
      // TODO delete the record
      console.log('Delete req.query ', req.query);
      res.redirect('/panel/menu');
    } else {
      const err = new Error('Invalid query parameters');
      err.status = 400;
      next(err);
    }
  }
];

/**
 * List clients endpoint
 */
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
/**
 * View client record endpoint
 *
 * Client record ID is passed as a GET query paraeter
 */
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

/**
 * Create new client record endpoint
 */
exports.createClient = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    const clientDefault = {
      clientSecret: uid2(config.database.defaultClient.randomSecretLength),
      trustedClient: config.database.defaultClient.trustedClient,
      allowedScope: config.database.defaultClient.allowedScope,
      defaultScope: config.database.defaultClient.defaultScope,
      allowedRedirectURI: config.database.defaultClient.allowedRedirectURI
    };
    return res.render('create-client', { name: req.user.name, clientDefault: clientDefault });
  }
];

/**
 * Create new client POST request handler
 */
exports.createClientHandler = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    console.log(req.body);
    return res.redirect('/panel/listusers');
  }
];

/**
 * Edit client record endpoint
 *
 * THe ID value is passed as a GET request query parameter
 */
exports.editClient = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.clients.find(req.query.id)
        .then((client) => {
          if (client == null) {
            const err = new Error('Invalid Id parameter');
            err.status = 400;
            return next(err);
          }

          const filteredClient = {
            id: client.id,
            name: client.name,
            clientId: client.clientId,
            clientSecret: client.clientSecret,
            allowedScope: client.allowedScope,
            defaultScope: client.defaultScope,
            allowedRedirectURI: client.allowedRedirectURI,
            updatedAt: client.updatedAt.toISOString(),
            createdAt: client.createdAt.toISOString()
          };

          if (client.trusted) {
            filteredClient.trusted = 'checked';
          } else {
            filteredClient.trusted = '';
          }
          return res.render('edit-client', { name: req.user.name, aclient: filteredClient });
        })
        .catch((err) => {
          return next(err);
        });
    } else {
      const err = new Error('Invalid query parameters');
      err.status = 400;
      next(err);
    }
  }
];

/**
 * Edit client POST request handler
 */
exports.editClientHandler = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    console.log(req.body);
    next();
  }
];

/**
 * Delete client record endpoint
 *
 * The ID is passed in as a GET request URL query parameter
 *
 * First call (query: id), lookup id, then render confirmation screen
 * Second call (query: id, confirmation='yes'), delete the record
 * Otherwise throw HTTP error
 */
exports.deleteClient = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.clients.find(req.query.id)
        .then((client) => {
          if (client == null) {
            const err = new Error('Invalid id parameter');
            err.status = 400;
            return next(err);
          }
          return res.render('confirm-delete-client', { name: req.client.name, deleteId: req.query.id });
        })
        .catch((err) => next(err));
    } else if ((req.query) && (Object.keys(req.query).length === 2) &&
      ('id' in req.query) && (req.query.confirm) && (req.query.confirm === 'yes')) {
      // TODO delete the record
      console.log('Delete req.query ', req.query);
      res.redirect('/panel/menu');
    } else {
      const err = new Error('Invalid query parameters');
      err.status = 400;
      next(err);
    }
  }
];

/**
 * Remove all tokens and invalidate all authorization server sessions
 * This will have no impact on any downstream web server session status.
 * However, any tokens the downstream web servers store on the users behalf
 * will be invalidated (revoked).
 *
 * This is a series of deleteAll database calls
 *
 * Note: when using MemoryStore, it is not possible to clear sessions
 * so only token will cleared unless uing PostgreSQL
 */
exports.removeAllTokens = [
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((req.query) && (req.query.confirm) && (req.query.confirm === 'yes')) {
      db.accessTokens.removeAll()
        .then(() => db.refreshTokens.removeAll())
        .then(() => db.sessions.removeAll())
        .then(() => res.render('generic-message', {
          name: req.user.name,
          title: 'Clear Auth',
          message: 'Access tokens and refresh tokens have been removed form the database. ' +
            'Authorization server session data has been cleared'
        }))
        .catch((err) => next(err));
    } else {
      res.render('confirm-remove', { name: req.user.name });
    }
  }
];
