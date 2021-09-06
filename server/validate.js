'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');
const db = require('./db');
const utils = require('./utils');
const jwt = require('jsonwebtoken');

/** Validate object to attach all functions to  */
const validate = Object.create(null);

/** Suppress tracing for things like unit testing */
// const suppressTrace = process.env.OAUTHRECIPES_SURPRESS_TRACE === 'true';

/** Private certificate used for signing JSON WebTokens */
// const privateKey = fs.readFileSync(path.join(__dirname, 'certs/privatekey.pem'));

/** Public certificate used for verification.  Note: you could also use the private key */
const publicKey = fs.readFileSync(path.join(__dirname, 'certs/certificate.pem'));

/**
 * Log the message and throw it as an Error
 * @param   {String} msg - Message to log and throw
 * @throws  {Error}  The given message as an error
 * @returns {undefined}
 */
validate.logAndThrow = (msg) => {
  // if (!suppressTrace) {
  //   console.trace(msg);
  // }
  console.log(msg);
  throw new Error(msg);
};

/**
 * Given a user and a password this will return the user if it exists and the password matches,
 * otherwise this will throw an error.
 *
 * Addionally, check that user.loginDisabled is not true
 *
 * @param   {Object} user     - The user profile
 * @param   {String} password - The user's password
 * @throws  {Error}  If the user does not exist or the password does not match
 * @returns {Object} The user if valid
 */
validate.user = (user, password) => {
  if (user.loginDisabled) {
    validate.logAndThrow('User login disabled');
    return null; // redundant to throw
  } else {
    validate.userExists(user);
    if (user.password !== password) {
      validate.logAndThrow('User password not correct');
      return null; // redundant to throw
    }
    return user;
  }
};

/**
 * Given a user this will return the user if it exists otherwise this will throw an error
 * @param   {Object} user - The user profile
 * @throws  {Error}  If the user does not exist or the password does not match
 * @returns {Object} The user if valid
 */
validate.userExists = (user) => {
  if (user == null) {
    validate.logAndThrow('User does not exist');
  }
  return user;
};

/**
 * Compares cookie/session authenticated username in http request to string username
 * This is used for change password form to make sure matches user
 * @param   {Object} req - Express request object
 * @param   {String} username username from passport change form
 * @returns {Promise} Promise resolving to useraname as String
 */
validate.usernameMatchesSession = (req, username) => {
  return new Promise((resolve, reject) => {
    if ((req.user) && (req.user.username) && (req.user.username === username)) {
      resolve(username);
    } else {
      const err = new Error('Not current user');
      err.status = 400;
      reject(err);
    }
  });
};

/**
 * Given a client and a client secret this return the client if it exists and its clientSecret
 * matches, otherwise this will throw an error
 * @param   {Object} client       - The client profile
 * @param   {String} clientSecret - The client's secret
 * @throws  {Error}  If the client or the client secret does not match
 * @returns {Object} The client if valid
 */
validate.client = (client, clientSecret) => {
  validate.clientExists(client);
  if (client.clientSecret !== clientSecret) {
    validate.logAndThrow('Client secret does not match');
    return null; // redundant to throw
  }
  return client;
};

/**
 * Given a client this will return the client if it exists , otherwise this will throw an error
 * @param   {Object} client - The client profile
 * @throws  {Error}  If the client does not exist
 * @returns {Object} The client if valid
 */
validate.clientExists = (client) => {
  if (client == null) {
    validate.logAndThrow('Client does not exist');
  }
  return client;
};

/**
 * Given a token and accessToken this will return either the user or the client associated with
 * the token if valid.  Otherwise this will throw.
 * @param   {Object}  token       - The token
 * @param   {Object}  accessToken - The access token
 * @throws  {Error}   If the token is not valid
 * @returns {Promise} Resolved with the user or client associated with the token if valid
 */
validate.token = (token, accessToken) => {
  // jwt.verify will throw an error upon failure
  const decoded = jwt.verify(accessToken, publicKey);

  // Build data object to return, additional data added in below before sending
  const verifyData = {
    decoded: decoded,
    token: token
  };

  // 1) Find client in database
  return db.clients.find(token.clientID)
    // 2) Not null
    .then((client) => validate.clientExists(client))
    // 3) Add client data to object
    .then((client) => {
      verifyData.client = {
        id: client.id,
        clientId: client.clientId,
        name: client.name
      };
      // 4) Check if user or client token
      if (token.userID) {
        // 5) Is user, lookup it up
        return db.users.find(token.userID);
      } else {
        // else client token, pass client along instead
        return Promise.resolve(client);
      }
    })
    .then((user) => {
      if (token.userID) {
        // 6) Is user, make sure lookup is not null
        return validate.userExists(user);
      } else {
        // else client token, pass client along
        return Promise.resolve(user);
      }
    })
    .then((user) => {
      // 7) if user, add user data to object
      if (token.userID) {
        verifyData.user = {
          id: user.id,
          username: user.username,
          name: user.name
        };
      }
      // 8) return response object as Promise
      return Promise.resolve(verifyData);
    });
};

/**
 * Given a refresh token and client this will return the refresh token if it exists and the client
 * id's match otherwise this will throw an error
 * throw an error
 * @param   {Object} token        - The token record from the DB
 * @param   {Object} refreshToken - The raw refresh token
 * @param   {Object} client       - The client profile
 * @throws  {Error}  If the refresh token does not exist or the client id's don't match
 * @returns {Object} The refresh token if valid
 */
validate.refreshToken = (token, refreshToken, client) => {
  // jwt.verify will throw an error upon failure
  jwt.verify(refreshToken, publicKey);

  if (client.id !== token.clientID) {
    validate.logAndThrow('RefreshToken clientID does not match client id given');
  }
  return token;
};

/**
 * Given a auth code, client, and redirectURI this will return the auth code if it exists and is
 * not 0, the client id matches it, and the redirectURI matches it, otherwise this will throw an
 * error.
 * @param  {Object}  code        - The auth code record from the DB
 * @param  {Object}  authCode    - The raw auth code
 * @param  {Object}  client      - The client profile
 * @param  {Object}  redirectURI - The redirectURI to check against
 * @throws {Error}   If the auth code does not exist or is zero or does not match the client or
 *                   the redirectURI
 * @returns {Object} The auth code token if valid
 */
validate.authCode = (code, authCode, client, redirectURI) => {
  if (new Date() > authCode.expirationDate) {
    validate.logAndThrow('AuthCode has expired');
  }
  if (client.id !== authCode.clientID) {
    validate.logAndThrow('AuthCode clientID does not match client id given');
  }
  if (redirectURI !== authCode.redirectURI) {
    validate.logAndThrow('AuthCode redirectURI does not match redirectURI given');
  }
  return authCode;
};

/**
 * I mimic openid connect's offline scope to determine if we send a refresh token or not
 *
 * If grant_type refresh_token disabled in the config, fail
 *
 * @param   {Array}   scope - The scope to check if is a refresh token if it has 'offline_access'
 * @returns {Boolean} true If the scope is offline_access, otherwise false
 */
validate.isRefreshToken = ({ scope }) => {
  return ((scope != null) &&
    (scope.indexOf('offline_access') === 0) &&
    (!config.oauth2.disableRefreshTokenGrant));
};

/**
 * Given a userId, clientID, and scope this will generate a refresh token, save it, and return it
 * @param   {Object}  userID   - The user profile
 * @throws  {Object}  clientID - the client profile
 * @throws  {Object}  scope    - the scope
 * @parms   {grantType} grantType - Oauth2 grant type
 * @parms   {authTime}  authTime  - Time of user authoriztion
 * @returns {Promise} The resolved refresh token after saved
 */
validate.generateRefreshToken = ({ userID, clientID, scope, grantType, authTime }) => {
  const refreshToken = utils.createToken({ sub: userID, exp: config.refreshToken.expiresIn });
  const expiration = new Date(Date.now() + (config.refreshToken.expiresIn * 1000));
  return db.refreshTokens.save(refreshToken, expiration, userID, clientID, scope, grantType, authTime)
    .then(() => refreshToken);
};

/**
 * Given an auth code this will generate a access token, save that token and then return it.
 * @param   {userID}    userID    - The user profile
 * @param   {clientID}  clientID  - The client profile
 * @param   {scope}     scope     - The scope
 * @parms   {grantType} grantType - Oauth2 grant type
 * @parms   {authTime}  authTime  - Time of user authoriztion
 * @returns {Promise}  The resolved refresh token after saved
 */
validate.generateToken = ({ userID, clientID, scope, grantType, authTime }) => {
  const token = utils.createToken({ sub: userID, exp: config.token.expiresIn });
  const expiration = new Date(Date.now() + (config.token.expiresIn * 1000));
  return db.accessTokens.save(token, expiration, userID, clientID, scope, grantType, authTime)
    .then(() => token);
};

/**
 * Given an auth code this will generate a access and refresh token, save both of those and return
 * them if the auth code indicates to return both.  Otherwise only an access token will be returned.
 * @param   {Object}  authCode - The auth code
 * @throws  {Error}   If the auth code does not exist or is zero
 * @returns {Promise} The resolved refresh and access tokens as an array
 */
validate.generateTokens = (authCode) => {
  // authcode = { clientID: redirectURI: userID: scope: grantType: authTime: }
  if (validate.isRefreshToken(authCode)) {
    return Promise.all([
      validate.generateToken(authCode),
      validate.generateRefreshToken(authCode)
    ]);
  }
  return Promise.all([validate.generateToken(authCode)]);
};

/**
 * Given a token this will resolve a promise with the token if it is not null and the expiration
 * date has not been exceeded.  Otherwise this will throw a HTTP error.
 * @param   {Object}  token - The token to check
 * @returns {Promise} Resolved with the token if it is a valid token otherwise rejected with error
 */
validate.tokenForHttp = (token) =>
  new Promise((resolve, reject) => {
    try {
      jwt.verify(token, publicKey);
    } catch (err) {
      const error = new Error('invalid_token');
      error.status = 400;
      reject(error);
    }
    resolve(token);
  });
/**
 * Given a token this will return the token if it is not null and not empty object.
 * Otherwise this will throw a HTTP error.
 * @param   {Object} token - The token to check
 * @throws  {Error}  If the client is null or if {}
 * @returns {Object} The client if it is a valid client
 */
validate.tokenExistsForHttp = (token) => {
  if (token == null) {
    const error = new Error('invalid_token');
    error.status = 400;
    throw error;
  }
  return token;
};

/**
 * Given a client this will return the client if it is not null. Otherwise this will throw a
 * HTTP error.
 * @param   {Object} client - The client to check
 * @throws  {Error}  If the client is null
 * @returns {Object} The client if it is a valid client
 */
validate.clientExistsForHttp = (client) => {
  if (client == null) {
    const error = new Error('invalid_token');
    error.status = 400;
    throw error;
  }
  return client;
};

module.exports = validate;
