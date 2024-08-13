'use strict';

const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');

const uid2 = require('uid2');
const db = require('./db');
const inputValidation = require('./input-validation');
const { toScopeString, toScopeArray, requireScopeForWebPanel } = require('./scope');
const logUtils = require('./log-utils');
const stats = require('./stats');
const { checkSessionAuth } = require('./session-auth');

const csrf = require('@dr.pogodin/csurf');
const csrfProtection = csrf({ cookie: false });

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
  checkSessionAuth(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    // Warning message if running Memory Store RAM database
    let visibility = '';
    if (config.database.enablePgUserDatabase) visibility = 'hidden';
    res.set('Cache-Control', 'no-store').render('menu-admin',
      { name: req.user.name, visibility: visibility });
  }
);

/**
 * List users endpoint
 */
router.get('/listusers',
  checkSessionAuth(),
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
          filteredUser.role = '';
          if ((user.role) && (user.role.length > 0)) {
            for (let j = 0; j < user.role.length; j++) {
              if (j < user.role.length - 1) {
                filteredUser.role += user.role[j] + ', ';
              } else {
                filteredUser.role += user.role[j];
              }
            }
          }
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toUTCString();
          } else {
            filteredUser.lastLogin = '';
          }
          // Change background color to gray when login disabled
          if (user.loginDisabled) {
            filteredUser.trClassTag = ' class="tr-list-disabled"';
          } else {
            filteredUser.trClassTag = '';
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
 * User record ID is passed as a GET query parameter
 */
router.get('/viewuser',
  checkSessionAuth(),
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
            role: toScopeString(user.role),
            updatedAt: user.updatedAt.toUTCString(),
            createdAt: user.createdAt.toUTCString()
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toUTCString();
          } else {
            filteredUser.lastLogin = '';
          }
          if (user.loginDisabled) {
            // Change color to red when login disabled
            filteredUser.loginDisabled = 'Yes';
            filteredUser.trClassTag = ' class="tr-form-disabled"';
          } else {
            filteredUser.loginDisabled = 'No';
            filteredUser.trClassTag = '';
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
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  csrfProtection,
  (req, res, next) => {
    const defaultUser = {
      role: toScopeString(config.database.defaultUser.role)
    };
    return res.set('Cache-Control', 'no-store').render('create-user',
      {
        csrfToken: req.csrfToken(),
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
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.createUser,
  csrfProtection,
  (req, res, next) => {
    if (req.body.newpassword1 !== req.body.newpassword2) {
      return res.set('Cache-Control', 'no-store').render('generic-message', {
        name: req.user.name,
        title: 'Create New User',
        message: 'Error: Passwords do not match, aborted.'
      });
    } else if ((req.body.newpassword1.length < config.data.userPasswordMinLength) ||
      (req.body.newpassword1.length > config.data.userPasswordMaxLength)) {
      return res.set('Cache-Control', 'no-store').render('generic-message', {
        name: req.user.name,
        title: 'Create New User',
        message: 'Error: Password invlid length, aborted'
      });
    } else {
      // Case of PostgreSQUL, use bcrypt to hash password
      let password = bcrypt.hashSync(req.body.newpassword1, 10);
      if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
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
              title: 'Create New User',
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
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.viewByUUID,
  csrfProtection,
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
            role: toScopeString(user.role),
            updatedAt: user.updatedAt.toUTCString(),
            createdAt: user.createdAt.toUTCString()
          };
          if (user.lastLogin) {
            filteredUser.lastLogin = user.lastLogin.toUTCString();
          } else {
            filteredUser.lastLogin = '';
          }
          if (user.loginDisabled) {
            filteredUser.disabled = 'checked';
            // Change background color to gray when login disabled
            filteredUser.trClassTag = ' class="tr-form-disabled"';
          } else {
            filteredUser.disabled = '';
            filteredUser.trClassTag = '';
          }
          return res.set('Cache-Control', 'no-store').render('edit-user',
            {
              csrfToken: req.csrfToken(),
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
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.editUser,
  csrfProtection,
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
          title: 'Create New User',
          message: 'Error: Passwords do not match, aborted.'
        });
      } else if ((req.body.newpassword1.length < config.data.userPasswordMinLength) ||
        (req.body.newpassword1.length > config.data.userPasswordMaxLength)) {
        return res.set('Cache-Control', 'no-store').render('generic-message', {
          name: req.user.name,
          title: 'Create New User',
          message: 'Error: Password invlid length, aborted'
        });
      } else {
        // Use bcrypt to hash password for PostgreSQL configuration
        password = bcrypt.hashSync(req.body.newpassword1, 10);
        if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
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
 * User confirmation to delete user record.
 *
 * The ID is passed in as a GET request URL query parameter
 */
router.get('/deleteuser',
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.viewByUUID,
  csrfProtection,
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
            {
              csrfToken: req.csrfToken(),
              name: req.user.name,
              deleteId: req.query.id
            });
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
 * This is POST request to delete user record from database
 *
 * The ID is passed in as a POST request URL body parameter
 */
router.post('/deleteuser',
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.deleteByUUID,
  csrfProtection,
  (req, res, next) => {
    if ((req.body) && (Object.keys(req.body).length === 2) &&
      ('id' in req.body) && ('_csrf' in req.body)) {
      db.users.delete(req.body.id)
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
      const err = new Error('Invalid POST parameters');
      err.status = 400;
      next(err);
    }
  }
);

/**
 * List clients endpoint
 */
router.get('/listclients',
  checkSessionAuth(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    db.clients.findAll()
      .then((clientArray) => {
        //
        // Process array of clients for display
        //
        const filteredArray = [];
        clientArray.forEach((client, i) => {
          const filteredClient = {
            id: client.id,
            name: client.name,
            clientId: client.clientId,
            clientSecret: 'ssh-secret'
          };

          filteredClient.allowedScope = '';
          if ((client.allowedScope) && (client.allowedScope.length > 0)) {
            for (let j = 0; j < client.allowedScope.length; j++) {
              if (j < client.allowedScope.length - 1) {
                filteredClient.allowedScope += client.allowedScope[j] + ', ';
              } else {
                filteredClient.allowedScope += client.allowedScope[j];
              }
            }
          }

          // Change background color to gray for disabled clients
          if (client.clientDisabled) {
            filteredClient.trClassTag = ' class="tr-list-disabled"';
          } else {
            filteredClient.trClassTag = '';
          }
          filteredArray.push(filteredClient);
        });
        //
        // Sort the array
        //
        filteredArray.sort((a, b) => {
          if (a.clientId.toUpperCase() > b.clientId.toUpperCase()) return 1;
          if (a.clientId.toUpperCase() < b.clientId.toUpperCase()) return -1;
          return 0;
        });
        //
        // Render the page
        //
        return res.set('Cache-Control', 'no-store').render('list-clients',
          { name: req.user.name, clients: filteredArray });
      })
      .catch((err) => {
        return next(err);
      });
  }
);

/**
 * View client record endpoint
 *
 * Client record ID is passed as a GET query parameter
 */
router.get('/viewclient',
  checkSessionAuth(),
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
        if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
          plainTextClientSecret = client.clientSecret;
        }
        const filteredClient = {
          id: client.id,
          name: client.name,
          clientId: client.clientId,
          clientSecret: null,
          allowedScope: toScopeString(client.allowedScope),
          allowedRedirectURI: toScopeString(client.allowedRedirectURI),
          updatedAt: client.updatedAt.toUTCString(),
          createdAt: client.createdAt.toUTCString()
        };
        if (config.oauth2.editorShowClientSecret) {
          filteredClient.clientSecret = plainTextClientSecret;
        } else {
          filteredClient.clientSecret = null;
        }

        if (client.trustedClient) {
          filteredClient.trustedClient = 'Yes';
        } else {
          filteredClient.trustedClient = 'No';
        }

        if (client.clientDisabled) {
          filteredClient.clientDisabled = 'Yes';
          // Change background color to gray when client disabled
          filteredClient.trClassTag = ' class="tr-form-disabled"';
        } else {
          filteredClient.clientDisabled = 'No';
          filteredClient.trClassTag = '';
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
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  csrfProtection,
  (req, res, next) => {
    const clientDefault = {
      clientSecret: uid2(config.database.defaultClient.randomSecretLength),
      trustedClient: config.database.defaultClient.trustedClient,
      allowedScope: toScopeString(config.database.defaultClient.allowedScope),
      allowedRedirectURI: toScopeString(config.database.defaultClient.allowedRedirectURI)
    };
    return res.set('Cache-Control', 'no-store').render('create-client',
      {
        csrfToken: req.csrfToken(),
        name: req.user.name,
        clientDefault: clientDefault
      });
  }
);

/**
 * Create new client POST request handler
 */
router.post('/createclient',
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.createClient,
  csrfProtection,
  (req, res, next) => {
    // Case of PostgreSQL database, use AES encryption on client secret
    let savedClientSecret =
      CryptoJS.AES.encrypt(req.body.clientSecret, config.oauth2.clientSecretAesKey).toString();
    if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
      // Else, case of in-memory database, plain text
      savedClientSecret = req.body.clientSecret;
    }
    if ((req.body.clientSecret.length < config.data.clientSecretMinLength) ||
      (req.body.clientSecret.length > config.data.clientSecretMaxLength)) {
      return res.set('Cache-Control', 'no-store').render('generic-message', {
        name: req.user.name,
        title: 'Create New Client',
        message: 'Error: Client secret invlid length, aborted'
      });
    }
    const client = {
      name: req.body.name,
      clientId: req.body.clientId,
      clientSecret: savedClientSecret,
      trustedClient: (req.body.trustedClient === 'on') || false,
      allowedScope: toScopeArray(req.body.allowedScope),
      allowedRedirectURI: toScopeArray(req.body.allowedRedirectURI),
      clientDisabled: (req.body.clientDisabled === 'on') || false
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
            title: 'Create New Client',
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
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.viewByUUID,
  csrfProtection,
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
          if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
            // Else, ease of in-memory database, Plain text
            plainTextClientSecret = client.clientSecret;
          }
          const filteredClient = {
            id: client.id,
            name: client.name,
            clientId: client.clientId,
            clientSecret: null,
            allowedScope: toScopeString(client.allowedScope),
            allowedRedirectURI: toScopeString(client.allowedRedirectURI),
            updatedAt: client.updatedAt.toUTCString(),
            createdAt: client.createdAt.toUTCString()
          };
          if (config.oauth2.editorShowClientSecret) {
            filteredClient.clientSecret = plainTextClientSecret;
          } else {
            filteredClient.clientSecret = null;
          }
          if (client.trustedClient) {
            filteredClient.trustedClient = 'checked';
          } else {
            filteredClient.trustedClient = '';
          }
          if (client.clientDisabled) {
            filteredClient.disabled = 'checked';
            // Change background color to gray when login disabled
            filteredClient.trClassTag = ' class="tr-form-disabled"';
          } else {
            filteredClient.disabled = '';
            filteredClient.trClassTag = '';
          }

          return res.set('Cache-Control', 'no-store').render('edit-client',
            {
              csrfToken: req.csrfToken(),
              name: req.user.name,
              aclient: filteredClient
            });
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
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.editClient,
  csrfProtection,
  (req, res, next) => {
    const client = {
      id: req.body.id,
      name: req.body.name,
      trustedClient: (req.body.trustedClient === 'on') || false,
      allowedScope: toScopeArray(req.body.allowedScope),
      allowedRedirectURI: toScopeArray(req.body.allowedRedirectURI),
      clientDisabled: (req.body.clientDisabled === 'on') || false
    };
    // If client secret is zero length or missing, the previous client secret will not be updated
    if ((req.body.clientSecret) &&
      (!(req.body.clientSecret == null)) && (req.body.clientSecret.length > 0)) {
      // length check
      if ((req.body.clientSecret.length < config.data.clientSecretMinLength) ||
        (req.body.clientSecret.length > config.data.clientSecretMaxLength)) {
        return res.set('Cache-Control', 'no-store').render('generic-message', {
          name: req.user.name,
          title: 'Create New Client',
          message: 'Error: Client secret invalid length, aborted'
        });
      }
      // Case of PostgreSQL database, use AES encryption on client secret
      client.clientSecret =
        CryptoJS.AES.encrypt(req.body.clientSecret, config.oauth2.clientSecretAesKey).toString();
      // for development environment env, override with plain text password
      if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
        // Else, Case of in-memory database, plain text
        client.clientSecret = req.body.clientSecret;
      }
    }
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
 * User confirming page for delete client
 *
 * The ID is passed in as a GET request URL query parameter
 */
router.get('/deleteclient',
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.viewByUUID,
  csrfProtection,
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
            {
              csrfToken: req.csrfToken(),
              name: req.client.name,
              deleteId: req.query.id
            });
        })
        .catch((err) => next(err));
    } else {
      const err = new Error('Invalid POST parameters');
      err.status = 400;
      next(err);
    }
  }
);
/**
 * This is POST request to delete client from database.
 *
 * The ID is passed in as a POST request URL body parameter
 *
 */
router.post('/deleteclient',
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  inputValidation.deleteByUUID,
  csrfProtection,
  (req, res, next) => {
    if ((req.body) && (Object.keys(req.body).length === 2) &&
      ('id' in req.body) && ('_csrf' in req.body)) {
      // console.log('deleting user');
      db.clients.delete(req.body.id)
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
 * Display user confirmation to remove all tokens and
 * invalidate all authorization server sessions
 */
router.get('/removealltokens',
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  csrfProtection,
  (req, res, next) => {
    res.set('Cache-Control', 'no-store').render('confirm-remove',
      {
        csrfToken: req.csrfToken(),
        name: req.user.name
      }
    );
  }
);

/**
 * Remove all tokens and invalidate all authorization server sessions
 * This will have no impact on any downstream web server session status.
 * However, any tokens the downstream web servers store on the users behalf
 * will be invalidated (revoked).
 *
 * This is a series of deleteAll database calls
 */
router.post('/removealltokens',
  checkSessionAuth({ failRedirectTo: '/panel/unauthorized' }),
  requireScopeForWebPanel('user.admin'),
  csrfProtection,
  (req, res, next) => {
    if ((req.body) && ('_csrf' in req.body)) {
      db.accessTokens.removeAll()
        .then(() => db.refreshTokens.removeAll())
        .then(() => db.sessions.removeAll(req))
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
      const err = new Error('Invalid POST parameters');
      err.status = 400;
      next(err);
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
  checkSessionAuth(),
  requireScopeForWebPanel('user.admin'),
  (req, res, next) => {
    Promise.all([
      db.accessTokens.rowCount(),
      db.refreshTokens.rowCount(),
      db.sessions.sessionCount(req)
    ])
      .then((dbCountArray) => {
        const rows = {
          accessToken: dbCountArray[0].toString(),
          refreshToken: dbCountArray[1].toString(),
          sessionCount: dbCountArray[2].toString()
        };
        const options = {
          name: req.user.name,
          start: stats.serverStartIsoString(),
          count: stats.counterToStringObj(),
          rows: rows,
          appVersion: config.server.appVersion,
          site: {
            vhost: config.site.vhost,
            authURL: config.site.authURL
          },
          oauth2: {
            vhost: config.site.vhost,
            authURL: config.site.authURL,
            sessionTtl: config.session.ttl,
            tokenExpiresInSeconds: config.oauth2.tokenExpiresInSeconds,
            refreshTokenExpiresInSeconds: config.oauth2.refreshTokenExpiresInSeconds,
            clientTokenExpiresInSeconds: config.oauth2.clientTokenExpiresInSeconds,
            authCodeExpiresInSeconds: config.oauth2.authCodeExpiresInSeconds
          }
        };
        res.render('stats', options);
      })
      .catch((err) => {
        console.log(err);
        next(err);
      });
  }
);

/**
 * Unauthorized Message Page
 *
 * This page does not require authorization
 *
 * Most of the /panel/* routes will redirect to the /login route
 * with a valid return URL stored in the users session.
 * However, pages that involve edit forms will not attempt
 * a return to the form. In this case, an alternate information
 * page is provided with a link back to the main admin panel menu
 */
router.get('/unauthorized',
  (req, res, next) => {
    res.render('menu-unauthorized',
      {
        name: ''
      }
    );
  }
);

module.exports = router;
