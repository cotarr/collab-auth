'use strict';

const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');

const config = require('./config');
const nodeEnv = process.env.NODE_ENV || 'development';

const db = require('./db');
const jwtUtils = require('./jwt-utils');
const stats = require('./stats');

/** Validate object to attach all functions to  */
const validate = Object.create(null);

/**
 * Timing safe compare, from express-basic-auth
 * @param   {Stromg} userInput - Express request object
 * @param   {String} secret - username from passport change form
 * @returns {Boolean} Return true if successful match, else false
 */
const safeCompare = function (userInput, secret) {
  const userInputLength = Buffer.byteLength(userInput);
  const secretLength = Buffer.byteLength(secret);
  const userInputBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
  userInputBuffer.write(userInput);
  const secretBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
  secretBuffer.write(secret);
  return !!(crypto.timingSafeEqual(userInputBuffer, secretBuffer)) &
    userInputLength === secretLength;
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
  if ((user != null) && (user.loginDisabled)) {
    console.log('User login disabled');
    throw new Error('User login disabled');
  } else {
    validate.userExists(user);
    if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
      //
      // User Password is PLAIN TEXT
      // This is case of in-memory database loaded from static files
      //
      // Timing safe compare
      if (safeCompare(user.password, password)) {
        return user;
      } else {
        throw new Error('User password not correct');
      }
    } else {
      //
      // This is case of PostsgreSQL database
      //
      // Unicode characters can be up to 4 bytes, bcrypt has maximum input 72 characters.
      const uint8PasswordArray = new TextEncoder('utf8').encode(password);
      if ((uint8PasswordArray.length <= 72) &&
        (password.length > 0)) {
        //
        // Check bcrypt salted hash to see if it matches
        //
        if (bcrypt.compareSync(password, user.password)) {
          return user;
        } else {
          throw new Error('User password not correct');
        }
      } else {
        const err = new Error('Bad login malformed request');
        err.status = 400;
        throw err;
      }
    }
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
    throw new Error('User does not exist');
  }
  return user;
};

/**
 * Compares cookie/session authenticated username in http request to string username
 * This is used for change password form to make sure matches user
 * @param   {Object} req - Express request object
 * @param   {String} username - username from passport change form
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
  if ((nodeEnv === 'development') && (!config.database.enablePgUserDatabase)) {
    //
    // Client secret is PLAIN TEXT
    //                  ==========
    // This is case of in-memory database loaded from static files
    //
    if (safeCompare(clientSecret, client.clientSecret)) {
      // Success, client secret matches
      return client;
    } else {
      console.log('Client secret does not match');
      throw new Error('Client secret does not match');
    }
  } else {
    //
    // Client secret is AES encrypted.
    //
    // This is case of PostsgreSQL database
    //
    const plainTextBytes =
      CryptoJS.AES.decrypt(client.clientSecret, config.oauth2.clientSecretAesKey);
    const plainTextClientSecret = plainTextBytes.toString(CryptoJS.enc.Utf8);
    // Timing safe compare
    if (safeCompare(clientSecret, plainTextClientSecret)) {
      // Success, client secret matches
      return client;
    } else {
      console.log('Client secret does not match');
      throw new Error('Client secret does not match');
    }
  }
};

/**
 * Given a client this will return the client if it exists , otherwise this will throw an error
 * @param   {Object} client - The client profile
 * @throws  {Error}  If the client does not exist
 * @returns {Object} The client if valid
 */
validate.clientExists = (client) => {
  if (client == null) {
    console.log('Client does not exist');
    throw new Error('Client does not exist');
  }
  return client;
};

/**
 * Given a token and accessToken this will compile and return a set of
 * token metaData associated with the token.
 *
 * This will throw error if
 *   Token signature fails verification
 *   If user or client token, Client not found in db lookup (maybe client was deleted)
 *   If user token, User was not found in db lookup (maybe user deleted)
 *   if user token, loginDisabled is true
 *
 * Note: this is the client that belongs to the token, not the client
 * performing the request.
 *
 * @param   {Object}  token       - The token
 * @param   {Object}  accessToken - The access token
 * @throws  {Error}   If the token is not valid
 * @returns {Promise} Resolved with the compiled token meta data (tokenMetaData)
 */
validate.token = (token, accessToken) => {
  // Verify will throw an error upon failure
  const decoded = jwtUtils.verifyToken(accessToken);

  // Build data object to return, additional data added in below before sending
  const tokenMetaData = {
    decoded: decoded,
    token: token
  };
  // 1) Find client in database
  return db.clients.find(token.clientID)
    // 2) Not null
    .then((client) => validate.clientExists(client))
    // 3) Add client data to object
    .then((client) => {
      tokenMetaData.client = {
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
        if (user.loginDisabled) {
          console.log('User login disabled');
          throw new Error('User login disabled');
        }
        tokenMetaData.user = {
          id: user.id,
          number: user.number,
          username: user.username,
          name: user.name
        };
      }
      // 8) return response object as Promise
      return Promise.resolve(tokenMetaData);
    });
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
    console.log('AuthCode has expired');
    throw new Error('AuthCode has expired');
  }
  if (client.id !== authCode.clientID) {
    console.log('AuthCode clientID does not match client id given');
    throw new Error('AuthCode clientID does not match client id given');
  }
  if (redirectURI !== authCode.redirectURI) {
    console.log('AuthCode redirectURI does not match redirectURI given');
    throw new Error('AuthCode redirectURI does not match redirectURI given');
  }
  return authCode;
};

/**
 * This is a place where new refresh_tokens can be disabled independent of
 * the access_token. THe scope parameter can be used exclude refresh_token
 * based on scope. THis is currently disabled by commenting out the line.
 *
 * @param   {Array}   scope - The scope to check if is a refresh token if it has 'offline_access'
 * @returns {Boolean} true If the scope is offline_access, otherwise false
 */
validate.isRefreshToken = ({ scope }) => {
  return ((scope != null) &&
    // disabled
    // (scope.indexOf('offline_access') === 0) &&
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
  const refreshToken =
    jwtUtils.createToken({ sub: userID, exp: config.oauth2.refreshTokenExpiresInSeconds });
  const expiration = new Date(Date.now() + (config.oauth2.refreshTokenExpiresInSeconds * 1000));
  return db.refreshTokens.save(
    refreshToken, expiration, userID, clientID, scope, grantType, authTime)
    .then(() => stats.incrementCounterPm({}, 'refreshToken'))
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
  const token = jwtUtils.createToken({ sub: userID, exp: config.oauth2.tokenExpiresInSeconds });
  const expiration = new Date(Date.now() + (config.oauth2.tokenExpiresInSeconds * 1000));
  return db.accessTokens.save(token, expiration, userID, clientID, scope, grantType, authTime)
    .then(() => stats.incrementCounterPm({}, 'userToken'))
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
* Given a token this will return the token if it is not null and not empty object.
* Otherwise this will throw a HTTP error.
* In the case of error, if optional log string is provided, send to console
* @param   {Object} token - The token to check
* @param   {String} logMessage - Optional, log the error with this string
* @throws  {Error}  If the client is null or if {}
* @returns {Object} The client if it is a valid client
*/
validate.tokenNotNull = (token, logMessage) => {
  // console.log('tokenNotNull ', token);
  if (token == null) {
    if (logMessage) console.log(logMessage);
    const error = new Error('invalid_token');
    error.status = 400;
    throw error;
  }
  return token;
};

module.exports = validate;
