'use strict';

const express = require('express');
const router = express.Router();

const uid2 = require('uid2');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const db = require('./db');
const inputValidation = require('./input-validation');
const { toScopeString, toScopeArray, requireScopeForWebPanel } = require('./scope');

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
router.get('/menu',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    // Warning message if running Memory Store RAM database
    let visibility = '';
    if (config.database.disableInMemoryDb) visibility = 'hidden';
    res.render('menu-admin', { name: req.user.name, visibility: visibility });
  }
);

/**
 * List users endpoint
 */
router.get('/listusers',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    db.users.findAll()
      .then((userArray) => {
        //
        // Process array of users for display
        //
        const filteredArray = [];
        userArray.forEach((user, i) => {
          const filteredUser = {
            id: user.id,
            username: user.username,
            name: user.name
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toUTCString();
          } else {
            filteredUser.lastLogin = '';
          }
          filteredArray.push(filteredUser);
        });
        //
        // sort the array
        //
        filteredArray.sort((a, b) => {
          if (a.username.toUpperCase() > b.username.toUpperCase()) return 1;
          if (a.username.toUpperCase() < b.username.toUpperCase()) return -1;
          return 0;
        });
        //
        // Render tha page
        //
        return res.render('list-users', { name: req.user.name, users: filteredArray });
      })
      .catch((err) => {
        return next(err);
      });
  }
);
/**
 * View user record endpoint
 *
 * User record ID is passed as a GET query paraeter
 */
router.get('/viewuser',
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
            role: toScopeString(user.role),
            updatedAt: user.updatedAt.toUTCString(),
            createdAt: user.createdAt.toUTCString()
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toUTCString();
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
);

/**
 * Create new user record endpoint
 */
router.get('/createuser',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    const defaultUser = {
      password: uid2(config.database.defaultUser.randomPasswordLength),
      role: toScopeString(config.database.defaultUser.role)
    };
    return res.render('create-user', { name: req.user.name, defaultUser: defaultUser });
  }
);

/**
 * Create new user POST request handler
 */
router.post('/createuser',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  inputValidation.createUser,
  (req, res, next) => {
    console.log(req.body);
    return res.redirect('/panel/menu');
  }
);

/**
 * Edit user record endpoint
 *
 * User ID is passed as a GET request URL query parameter
 */
router.get('/edituser',
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
            role: toScopeString(user.role),
            updatedAt: user.updatedAt.toUTCString(),
            createdAt: user.createdAt.toUTCString()
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toUTCString();
          } else {
            filteredUser.lastLogin = '';
          }
          if (user.disabled) {
            filteredUser.disabled = 'checked';
          } else {
            filteredUser.disabled = '';
          }
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
);

/**
 * Edit user POST request handler
 */
router.post('/edituser',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  inputValidation.editUser,
  (req, res, next) => {
    console.log(req.body);
    return res.redirect('/panel/listusers');
  }
);

/**
 * Delete user record endpoint
 *
 * The ID is passed in as a GET request URL query parameter
 *
 * First call (query: id) lookup id, then render confirmation screen
 * Second call (query: id, confirmation='yes'), delete the record
 * Otherwise throw HTTP error
 */
router.get('/deleteuser',
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
);

/**
 * List clients endpoint
 */
router.get('/listclients',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    db.clients.findAll()
      .then((clientArray) => {
        //
        // Sort the array
        //
        clientArray.sort((a, b) => {
          if (a.clientId.toUpperCase() > b.clientId.toUpperCase()) return 1;
          if (a.clientId.toUpperCase() < b.clientId.toUpperCase()) return -1;
          return 0;
        });
        //
        // Render the page
        //
        return res.render('list-clients', { name: req.user.name, clients: clientArray });
      })
      .catch((err) => {
        return next(err);
      });
  }
);

/**
 * View client record endpoint
 *
 * Client record ID is passed as a GET query paraeter
 */
router.get('/viewclient',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    if ((!req.query) || (!req.query.id)) {
      // 404 not found
      return next();
    }
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
          allowedScope: toScopeString(client.allowedScope),
          allowedRedirectURI: toScopeString(client.allowedRedirectURI),
          updatedAt: client.updatedAt.toUTCString(),
          createdAt: client.createdAt.toUTCString()
        };

        if (client.trustedClient) {
          filteredClient.trustedClient = 'Yes';
        } else {
          filteredClient.trustedClient = 'No';
        }
        return res.render('view-client', { name: req.user.name, aclient: filteredClient });
      })
      .catch((err) => {
        return next(err);
      });
  }
);

/**
 * Create new client record endpoint
 */
router.get('/createclient',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    const clientDefault = {
      clientSecret: uid2(config.database.defaultClient.randomSecretLength),
      trustedClient: config.database.defaultClient.trustedClient,
      allowedScope: toScopeString(config.database.defaultClient.allowedScope),
      allowedRedirectURI: toScopeString(config.database.defaultClient.allowedRedirectURI)
    };
    return res.render('create-client', { name: req.user.name, clientDefault: clientDefault });
  }
);

/**
 * Create new client POST request handler
 */
router.post('/createclient',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  inputValidation.createClient,
  (req, res, next) => {
    const client = {
      name: req.body.name,
      clientId: req.body.clientId,
      clientSecret: req.body.clientSecret,
      trustedClient: (req.body.trustedClient === 'on') || false,
      allowedScope: toScopeArray(req.body.allowedScope),
      allowedRedirectURI: toScopeArray(req.body.allowedRedirectURI)
    };
    db.clients.save(client)
      .then((createdClient) => {
        if (createdClient == null) {
          throw new Error('Error saving client');
        } else {
          return res.render('generic-message', {
            name: req.user.name,
            title: 'Ceate New Client',
            message: 'New client record successfully saved.'
          });
        }
      })
      .catch((err) => {
        if (err.message === 'clientId already exists') {
          return res.render('generic-message', {
            name: req.user.name,
            title: 'Bad Request',
            message: 'clientId already exists'
          });
        } else {
          return next(err);
        }
      });
  }
);

/**
 * Edit client record endpoint
 *
 * THe ID value is passed as a GET request query parameter
 */
router.get('/editclient',
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
            allowedScope: toScopeString(client.allowedScope),
            allowedRedirectURI: toScopeString(client.allowedRedirectURI),
            updatedAt: client.updatedAt.toUTCString(),
            createdAt: client.createdAt.toUTCString()
          };

          if (client.trustedClient) {
            filteredClient.trustedClient = 'checked';
          } else {
            filteredClient.trustedClient = '';
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
);

/**
 * Edit client POST request handler
 */
router.post('/editclient',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  inputValidation.editClient,
  (req, res, next) => {
    const client = {
      id: req.body.id,
      name: req.body.name,
      clientSecret: req.body.clientSecret,
      trustedClient: (req.body.trustedClient === 'on') || false,
      allowedScope: toScopeArray(req.body.allowedScope),
      allowedRedirectURI: toScopeArray(req.body.allowedRedirectURI)
    };
    db.clients.update(client)
      .then((createdClient) => {
        if (createdClient == null) {
          throw new Error('Error saving client');
        } else {
          return res.render('generic-message', {
            name: req.user.name,
            title: 'Edit Client',
            message: 'Modified client record successfully saved.'
          });
        }
      })
      .catch((err) => {
        if (err.message === 'clientId already exists') {
          return res.render('generic-message', {
            name: req.user.name,
            title: 'Bad Request',
            message: 'clientId already exists'
          });
        } else {
          return next(err);
        }
      });
  }
);

/**
 * Delete client record endpoint
 *
 * The ID is passed in as a GET request URL query parameter
 *
 * First call (query: id), lookup id, then render confirmation screen
 * Second call (query: id, confirmation='yes'), delete the record
 * Otherwise throw HTTP error
 */
router.get('/deleteclient',
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
      db.clients.delete(req.query.id)
        .then((deletedClient) => {
          if (deletedClient == null) {
            throw new Error('Error deleting client');
          } else {
            return res.render('generic-message', {
              name: req.user.name,
              title: 'Delete Client',
              message: 'Client successfully deleted.'
            });
          }
        })
        .catch((err) => next(err));
    } else {
      const err = new Error('Invalid query parameters');
      err.status = 400;
      next(err);
    }
  }
);

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
router.get('/removealltokens',
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
);

module.exports = router;
