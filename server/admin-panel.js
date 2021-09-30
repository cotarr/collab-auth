'use strict';

const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');

const uid2 = require('uid2');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
const db = require('./db');
const inputValidation = require('./input-validation');
const { toScopeString, toScopeArray, requireScopeForWebPanel } = require('./scope');
const logUtils = require('./log-utils');
const stats = require('./stats');

const config = require('./config/');
const nodeEnv = process.env.NODE_ENV || 'development';

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
    res.set('Cache-Control', 'no-store').render('menu-admin',
      { name: req.user.name, visibility: visibility });
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
            number: user.number,
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
        return res.set('Cache-Control', 'no-store').render('list-users',
          { name: req.user.name, users: filteredArray });
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
  inputValidation.viewByUUID,
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
            number: user.number,
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
          return res.set('Cache-Control', 'no-store').render('view-user',
            { name: req.user.name, user: filteredUser });
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
      role: toScopeString(config.database.defaultUser.role)
    };
    return res.set('Cache-Control', 'no-store').render('create-user',
      {
        name: req.user.name,
        defaultUser: defaultUser,
        opt: {
          minPwLen: config.data.userPasswordMinLength,
          maxPwLen: config.data.userPasswordMaxLength
        }
      });
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
    if (req.body.newpassword1 !== req.body.newpassword2) {
      return res.set('Cache-Control', 'no-store').render('generic-message', {
        name: req.user.name,
        title: 'Ceate New User',
        message: 'Error: Passwords do not match, aborted.'
      });
    } else if ((req.body.newpassword1.length < config.data.userPasswordMinLength) ||
      (req.body.newpassword1.length > config.data.userPasswordMaxLength)) {
      return res.set('Cache-Control', 'no-store').render('generic-message', {
        name: req.user.name,
        title: 'Ceate New User',
        message: 'Error: Password invlid length, aborted'
      });
    } else {
      // Case of PostgreSQUL, use bcrypt to hash password
      let password = bcrypt.hashSync(req.body.newpassword1, 10);
      if ((nodeEnv === 'development') && (!config.database.disableInMemoryDb)) {
        // Else, case of in Memory storage, use Plain Text
        password = req.body.newpassword1;
      }
      const user = {
        name: req.body.name,
        number: req.body.number,
        username: req.body.username,
        password: password,
        loginDisabled: (req.body.loginDisabled === 'on') || false,
        role: toScopeArray(req.body.role)
      };
      db.users.save(user)
        .then((createdUser) => {
          if (createdUser == null) {
            throw new Error('Error saving user');
          } else {
            const message = req.user.username + ' created new user: ' + createdUser.username;
            logUtils.adminLogActivity(req, message);
            return res.set('Cache-Control', 'no-store').render('generic-message', {
              name: req.user.name,
              title: 'Ceate New User',
              message: 'New user record successfully saved.'
            });
          }
        })
        .catch((err) => next(err));
    }
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
  inputValidation.viewByUUID,
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
            number: user.number,
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
          return res.set('Cache-Control', 'no-store').render('edit-user',
            {
              name: req.user.name,
              user: filteredUser,
              opt: {
                // if blank password unchanged
                minPwLen: 0,
                maxPwLen: config.data.userPasswordMaxLength
              }
            }
          );
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
    // Password is optional, if both password input elements are empty,
    // then, the password will remain unchanged.
    let password;
    if (((req.body.newpassword1) && (req.body.newpassword1.length > 0)) ||
      ((req.body.newpassword2) && (req.body.newpassword2.length > 0))) {
      // Case of password present, it must be checked
      if (req.body.newpassword1 !== req.body.newpassword2) {
        return res.set('Cache-Control', 'no-store').render('generic-message', {
          name: req.user.name,
          title: 'Ceate New User',
          message: 'Error: Passwords do not match, aborted.'
        });
      } else if ((req.body.newpassword1.length < config.data.userPasswordMinLength) ||
        (req.body.newpassword1.length > config.data.userPasswordMaxLength)) {
        return res.set('Cache-Control', 'no-store').render('generic-message', {
          name: req.user.name,
          title: 'Ceate New User',
          message: 'Error: Password invlid length, aborted'
        });
      } else {
        // Use bcrypt to hash password for PostgreSQL configuration
        password = bcrypt.hashSync(req.body.newpassword1, 10);
        if ((nodeEnv === 'development') && (!config.database.disableInMemoryDb)) {
          // Else, in Memory storage, use Plain Text
          password = req.body.newpassword1;
        }
      }
    }
    const user = {
      id: req.body.id,
      name: req.body.name,
      password: undefined,
      loginDisabled: (req.body.loginDisabled === 'on') || false,
      role: toScopeArray(req.body.role)
    };
    if (password) user.password = password;
    db.users.update(user)
      .then((editedUser) => {
        if (editedUser == null) {
          throw new Error('Error saving user');
        } else {
          const message = req.user.username + ' edited user: ' + editedUser.username;
          logUtils.adminLogActivity(req, message);
          return res.set('Cache-Control', 'no-store').render('generic-message', {
            name: req.user.name,
            title: 'Edit User',
            message: 'Modified user record successfully saved.'
          });
        }
      })
      .catch((err) => next(err));
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
  inputValidation.deleteByUUID,
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.users.find(req.query.id)
        .then((user) => {
          if (user == null) {
            const err = new Error('Invalid id parameter');
            err.status = 400;
            return next(err);
          }
          return res.set('Cache-Control', 'no-store').render('confirm-delete-user',
            { name: req.user.name, deleteId: req.query.id });
        })
        .catch((err) => next(err));
    } else if ((req.query) && (Object.keys(req.query).length === 2) &&
      ('id' in req.query) && (req.query.confirm) && (req.query.confirm === 'yes')) {
      db.users.delete(req.query.id)
        .then((deletedUser) => {
          if (deletedUser == null) {
            throw new Error('Error deleting user');
          } else {
            const message = req.user.username + ' deleted user: ' + deletedUser.username;
            logUtils.adminLogActivity(req, message);
            return res.set('Cache-Control', 'no-store').render('generic-message', {
              name: req.user.name,
              title: 'Delete User',
              message: 'User successfully deleted.'
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
        return res.set('Cache-Control', 'no-store').render('list-clients',
          { name: req.user.name, clients: clientArray });
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
  inputValidation.viewByUUID,
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
        // Case of PostgreSQL, client secret is AES encrypted
        const plainTextBytes =
          CryptoJS.AES.decrypt(client.clientSecret, config.oauth2.clientSecretAesKey);
        let plainTextClientSecret = plainTextBytes.toString(CryptoJS.enc.Utf8);
        if ((nodeEnv === 'development') && (!config.database.disableInMemoryDb)) {
          plainTextClientSecret = client.clientSecret;
        }
        const filteredClient = {
          id: client.id,
          name: client.name,
          clientId: client.clientId,
          clientSecret: plainTextClientSecret,
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
        return res.set('Cache-Control', 'no-store').render('view-client',
          { name: req.user.name, aclient: filteredClient });
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
    return res.set('Cache-Control', 'no-store').render('create-client',
      { name: req.user.name, clientDefault: clientDefault });
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
    // Case of PostgreSQL database, use AES encryption on client secret
    let savedClientSecret =
      CryptoJS.AES.encrypt(req.body.clientSecret, config.oauth2.clientSecretAesKey).toString();
    if ((nodeEnv === 'development') && (!config.database.disableInMemoryDb)) {
      // Else, case of in-memory database, plain text
      savedClientSecret = req.body.clientSecret;
    }
    const client = {
      name: req.body.name,
      clientId: req.body.clientId,
      clientSecret: savedClientSecret,
      trustedClient: (req.body.trustedClient === 'on') || false,
      allowedScope: toScopeArray(req.body.allowedScope),
      allowedRedirectURI: toScopeArray(req.body.allowedRedirectURI)
    };
    db.clients.save(client)
      .then((createdClient) => {
        if (createdClient == null) {
          throw new Error('Error saving client');
        } else {
          const message = req.user.username + ' created new client: ' + createdClient.clientId;
          logUtils.adminLogActivity(req, message);
          return res.set('Cache-Control', 'no-store').render('generic-message', {
            name: req.user.name,
            title: 'Ceate New Client',
            message: 'New client record successfully saved.'
          });
        }
      })
      .catch((err) => next(err));
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
  inputValidation.viewByUUID,
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.clients.find(req.query.id)
        .then((client) => {
          if (client == null) {
            const err = new Error('Invalid Id parameter');
            err.status = 400;
            return next(err);
          }
          // Case of PostgreSQL, client secret is AES encrypted
          const plainTextBytes =
            CryptoJS.AES.decrypt(client.clientSecret, config.oauth2.clientSecretAesKey);
          let plainTextClientSecret = plainTextBytes.toString(CryptoJS.enc.Utf8);
          if ((nodeEnv === 'development') && (!config.database.disableInMemoryDb)) {
            // Else, ease of in-memory database, Plain text
            plainTextClientSecret = client.clientSecret;
          }
          const filteredClient = {
            id: client.id,
            name: client.name,
            clientId: client.clientId,
            clientSecret: plainTextClientSecret,
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
          return res.set('Cache-Control', 'no-store').render('edit-client',
            { name: req.user.name, aclient: filteredClient });
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
    // Case of PostgreSQL database, use AES encryption on client secret
    let savedClientSecret =
      CryptoJS.AES.encrypt(req.body.clientSecret, config.oauth2.clientSecretAesKey).toString();
    if ((nodeEnv === 'development') && (!config.database.disableInMemoryDb)) {
      // Else, Case of in-memory database, plain text
      savedClientSecret = req.body.clientSecret;
    }
    const client = {
      id: req.body.id,
      name: req.body.name,
      clientSecret: savedClientSecret,
      trustedClient: (req.body.trustedClient === 'on') || false,
      allowedScope: toScopeArray(req.body.allowedScope),
      allowedRedirectURI: toScopeArray(req.body.allowedRedirectURI)
    };
    db.clients.update(client)
      .then((editedClient) => {
        if (editedClient == null) {
          throw new Error('Error saving client');
        } else {
          const message = req.user.username + ' edited client: ' + editedClient.clientId;
          logUtils.adminLogActivity(req, message);
          return res.set('Cache-Control', 'no-store').render('generic-message', {
            name: req.user.name,
            title: 'Edit Client',
            message: 'Modified client record successfully saved.'
          });
        }
      })
      .catch((err) => next(err));
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
  inputValidation.deleteByUUID,
  (req, res, next) => {
    if ((req.query) && (Object.keys(req.query).length === 1) && ('id' in req.query)) {
      db.clients.find(req.query.id)
        .then((client) => {
          if (client == null) {
            const err = new Error('Invalid id parameter');
            err.status = 400;
            return next(err);
          }
          return res.set('Cache-Control', 'no-store').render('confirm-delete-client',
            { name: req.client.name, deleteId: req.query.id });
        })
        .catch((err) => next(err));
    } else if ((req.query) && (Object.keys(req.query).length === 2) &&
      ('id' in req.query) && (req.query.confirm) && (req.query.confirm === 'yes')) {
      // console.log('deleting user');
      db.clients.delete(req.query.id)
        .then((deletedClient) => {
          if (deletedClient == null) {
            throw new Error('Error deleting client');
          } else {
            const message = req.user.username + ' deleted client: ' + deletedClient.clientId;
            logUtils.adminLogActivity(req, message);
            return res.set('Cache-Control', 'no-store').render('generic-message', {
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
        .then(() => {
          const message = req.user.username + ' removed all token and cleared sessions';
          logUtils.adminLogActivity(req, message);
          return res.set('Cache-Control', 'no-store').render('generic-message', {
            name: req.user.name,
            title: 'Clear Auth',
            message: 'Access tokens and refresh tokens have been removed form the database. ' +
              'Authorization server session data has been cleared'
          });
        })
        .catch((err) => {
          return next(err);
        });
    } else {
      res.set('Cache-Control', 'no-store').render('confirm-remove', { name: req.user.name });
    }
  }
);

/**
 * Admin menu endpoint
 *
 * The admin menu call the remaining functions in this module
 * to manage the user records and client records in the database.
 * The pages are simple server side forms.
 * Password authentication is required with user role = user.admin
 */
router.get('/stats',
  ensureLoggedIn(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    const options = {
      name: req.user.name,
      start: stats.serverStartIsoString(),
      count: stats.counterToStringObj()
    };
    res.render('stats', options);
  }
);

module.exports = router;
