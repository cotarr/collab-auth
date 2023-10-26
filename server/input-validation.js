//
// Form input validation using express-validator
//

'use strict';

const { validationResult } = require('express-validator');
const { query, body } = require('express-validator');

const config = require('./config/');

const nameAllowedChars =
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.-_@';
const idAllowedChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.-_@';
const scopeAllowedChars =
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.,_';
const uriAllowedChars =
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890:,"\'/%._-?&';

/**
 * Middleware error handler (web Interface)
 */
const handleErrorHTTP = (req, res, next) => {
  const allErrors = [];

  // First, errors from express-validator
  const validatorErrors = validationResult(req).array();
  for (const err of validatorErrors) {
    //
    // This is an authorization server, so the value
    // property is deleted to prevent logging or returning credentials
    delete err.value;
    allErrors.push(err);
  }
  // Second add custom errors from req.locals.errors
  if (!req.locals) req.locals = {};
  if (!req.locals.errors) req.locals.errors = [];
  const customErrors = req.locals.errors;

  for (const err of customErrors) {
    allErrors.push(err);
  }
  //
  // For now, errors are handled as an API would be.
  // This means web user will see the error.
  // TODO handle errors with user friendly web page
  //
  // return the error
  if (allErrors.length > 0) {
    return res.status(422).json({
      status: 422,
      message: 'Unprocessable Entity',
      errors: allErrors
    });
  } else {
    next();
  }
};

/**
 * Middleware error handler (oauth API Interface)
 * Includes WWW-Authenticate header
 */
const handleErrorOauth = (req, res, next) => {
  const allErrors = [];

  // First, errors from express-validator
  const validatorErrors = validationResult(req).array();
  for (const err of validatorErrors) {
    //
    // This is an authorization server, so the value
    // property is deleted to prevent logging or returning credentials
    delete err.value;
    allErrors.push(err);
  }
  // Second add custom errors from req.locals.errors
  if (!req.locals) req.locals = {};
  if (!req.locals.errors) req.locals.errors = [];
  const customErrors = req.locals.errors;

  for (const err of customErrors) {
    allErrors.push(err);
  }
  //
  // For now, errors are handled as an API would be.
  // This means web user will see the error.
  // TODO handle errors with user friendly web page
  //
  // return the error
  if (allErrors.length > 0) {
    // WWW-Authenticate Response Header rfc2617 Section-3.2.1
    const wwwError = 'Bearer realm=user@' + config.site.ownHost +
    ' error="Bad Request", error_description="Input validation failed"';
    return res.set('WWW-Authenticate', wwwError).status(400).json({
      status: 400,
      message: 'Bad Request',
      errors: allErrors
    });
  } else {
    next();
  }
};

/**
 * Middleware to check input for extraneous keys.
 *
 * check all keys in query object, extraneous keys are error
 *
 * Accepts req.query or req.body or req.params as checkObject
 * modifies req object
 * returns null
 *  location = string with 'query', 'params', or 'body'.
 *  location = array with values optional: ['query', 'params', 'body'];
 *
 * Calling function:
 *     function(req, res, next) {
 *       checkExtraneousKeys(req, allowedKeys, location);
 *       next();
 *     },
 *
 * @param {Array} allowedKeys - Array containing allowed key string
 * @param {string|Array} location - Allowed: body, query, params, noquery
 */
const checkExtraneousKeys = function (allowKeys, location) {
  return (req, res, next) => {
    let locationArray = [];
    if (Array.isArray(location)) {
      locationArray = location;
    }
    if (typeof location === 'string') {
      locationArray.push(location);
    }

    if (!req.locals) req.locals = {};
    if (!req.locals.errors) req.locals.errors = [];

    function checkKeys (checkObject, locationString) {
      const keys = Object.keys(checkObject);
      for (const key of keys) {
        if (allowKeys.indexOf(key) < 0) {
          req.locals.errors.push({
            type: 'field',
            msg: 'Invalid param',
            path: key,
            location: locationString
          });
        }
      }
    }

    if (locationArray.indexOf('query') >= 0) {
      checkKeys(req.query, 'query');
    }

    if (locationArray.indexOf('params') >= 0) {
      checkKeys(req.params, 'params');
    }

    if (locationArray.indexOf('body') >= 0) {
      checkKeys(req.body, 'body');
    }

    if (locationArray.indexOf('noquery') >= 0) {
      const queryKeys = Object.keys(req.query);
      for (const key of queryKeys) {
        req.locals.errors.push({
          type: 'field',
          msg: 'Invalid param',
          path: key,
          location: 'query'
        });
      } // next key
    } // if noquery
    next();
  };
};

/**
 * Login GET request
 *
 * Array of middleware functions for input validation
 */
exports.loginGetRequest = [
  checkExtraneousKeys(['retry'], 'query'),
  query(['retry'])
    .optional()
    .isLength({ min: 0, max: 16 })
    .withMessage('Invalid string length'),
  handleErrorHTTP
]; // Login GET Request

/**
 * Login POST request
 *
 * Array of middleware functions for input validation
 */
exports.loginPostRequest = [
  checkExtraneousKeys([
    '_csrf',
    'username',
    'password'], 'body'),
  // Required Body Keys
  body([
    '_csrf',
    'username',
    'password'])
    .exists()
    .withMessage('Required value'),
  //
  // Validate Required keys
  //
  body('username')
    .isLength({ min: config.data.userUsernameMinLength, max: config.data.userUsernameMaxLength })
    .withMessage('Invalid string length'),
  body('username')
    .isWhitelisted(idAllowedChars)
    .withMessage('Invalid characters in string'),
  body('password')
    .isLength({ min: 1, max: config.data.userPasswordMaxLength })
    .withMessage('Invalid string length'),
  handleErrorHTTP
]; // Login POST Request

/**
 * Validate input for ?id=UUID.v4
 *
 * Array of middleware functions for input validation
 */
exports.viewByUUID = [
  checkExtraneousKeys(['id'], 'query'),
  query('id')
    .exists()
    .withMessage('Required values'),
  query('id')
    .isUUID(4)
    .withMessage('Invalid UUID.v4'),
  handleErrorHTTP
]; // viewByUUID

/**
 * Validate input for ?id=UUID.v4
 *
 * Array of middleware functions for input validation
 */
exports.deleteByUUID = [
  checkExtraneousKeys(['_csrf', 'id'], 'body'),
  body('id')
    .exists()
    .withMessage('Required values'),
  body('id')
    .isUUID(4)
    .withMessage('Invalid UUID.v4'),
  handleErrorHTTP
]; // deleteByUUID

/**
 * Create User POST request
 *
 * Array of middleware functions for input validation
 */
exports.createUser = [
  checkExtraneousKeys([
    '_csrf',
    'number',
    'username',
    'newpassword1',
    'newpassword2',
    'name',
    'loginDisabled',
    'role'], 'body'),
  // Forbidden body keys
  body([
    'id',
    'updatedAt',
    'createdAt'])
    .not().exists()
    .withMessage('Forbidden property (Server generated)'),
  // Required Body Keys
  body([
    '_csrf',
    'number',
    'username',
    'newpassword1',
    'name',
    'role'])
    .exists()
    .withMessage('Required value'),
  //
  // Validate Required keys
  //
  body('number')
    .isInt({ min: 0, max: 1000000000 })
    .withMessage('Invalid positive integer value'),
  body('name')
    .isLength({ min: config.data.userNameMinLength, max: config.data.userNameMaxLength })
    .withMessage('Invalid string length'),
  body('name')
    .isWhitelisted(nameAllowedChars)
    .withMessage('Invalid characters in string'),
  body('username')
    .isLength({ min: config.data.userUsernameMinLength, max: config.data.userUsernameMaxLength })
    .withMessage('Invalid string length'),
  body('username')
    .isWhitelisted(idAllowedChars)
    .withMessage('Invalid characters in string'),
  // Password length validated in javascript, 72 is max bcrypt byte length
  body('newpassword1')
    .isLength({ min: 1, max: 72 })
    .withMessage('Invalid string length'),
  body('newpassword2')
    .isLength({ min: 1, max: 72 })
    .withMessage('Invalid string length'),
  body('loginDisabled')
    .optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('role')
    .isLength({ max: config.data.allScopesMaxLength })
    .withMessage('Invalid string length'),
  body('role')
    .isWhitelisted(scopeAllowedChars)
    .withMessage('Invalid characters in string'),
  handleErrorHTTP
]; // createUser

/**
 * Edit User POST request
 *
 * Array of middleware functions for input validation
 */
exports.editUser = [
  checkExtraneousKeys([
    '_csrf',
    'id',
    'newpassword1',
    'newpassword2',
    'name',
    'loginDisabled',
    'role'], 'body'),
  // Forbidden body keys
  body([
    'number',
    'username'])
    .not().exists()
    .withMessage('Forbidden property (read only)'),
  // Forbidden Body Keys
  body([
    'updatedAt',
    'createdAt'])
    .not().exists()
    .withMessage('Server generated values not allowed'),
  // Required Body Keys
  body([
    '_csrf',
    'id',
    'name',
    'role'])
    .exists()
    .withMessage('Required value'),
  //
  // Validate Required keys
  //
  body('id')
    .isUUID(4)
    .withMessage('Invalid UUID.v4'),
  body('name')
    .isLength({ min: config.data.userNameMinLength, max: config.data.userNameMaxLength })
    .withMessage('Invalid string length'),
  body('name')
    .isWhitelisted(nameAllowedChars)
    .withMessage('Invalid characters in string'),
  // Password length validated in javascript, 72 is max bcrypt byte length
  body('newpassword1')
    .optional()
    .isLength({ min: 0, max: 72 })
    .withMessage('Invalid string length'),
  body('newpassword2')
    .optional()
    .isLength({ min: 0, max: 72 })
    .withMessage('Invalid string length'),
  body('loginDisabled').optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('role')
    .isLength({ max: config.data.allScopesMaxLength })
    .withMessage('Invalid string length'),
  body('role')
    .isWhitelisted(scopeAllowedChars)
    .withMessage('Invalid characters in string'),
  handleErrorHTTP
]; // editUser

/**
 * Change user password POST request
 *
 * Array of middleware functions for input validation
 */
exports.changePassword = [
  checkExtraneousKeys([
    '_csrf',
    'username',
    'oldpassword',
    'newpassword1',
    'newpassword2'], 'body'),
  // Required Body Keys
  body([
    '_csrf',
    'username',
    'oldpassword',
    'newpassword1',
    'newpassword2'])
    .exists()
    .withMessage('Required value'),
  //
  // Validate Required keys
  //
  body('username')
    .isLength({ min: config.data.userUsernameMinLength, max: config.data.userUsernameMaxLength })
    .withMessage('Invalid string length'),
  body('username')
    .isWhitelisted(idAllowedChars)
    .withMessage('Invalid characters in string'),
  // String length checked in javascript, 72 is maximum bytes for bcrypt
  body('newpassword1')
    .optional()
    .isLength({ min: 1, max: 72 })
    .withMessage('Invalid string length'),
  body('newpassword1')
    .optional()
    .isLength({ min: 1, max: 72 })
    .withMessage('Invalid string length'),
  body('newpassword2')
    .optional()
    .isLength({ min: 1, max: 72 })
    .withMessage('Invalid string length'),
  handleErrorHTTP
]; // Change Password

/**
 * Create Client POST request
 *
 * Array of middleware functions for input validation
 */
exports.createClient = [
  checkExtraneousKeys([
    '_csrf',
    'name',
    'clientId',
    'clientSecret',
    'trustedClient',
    'allowedScope',
    'allowedRedirectURI'], 'body'),
  // Forbidden body keys
  body([
    'id',
    'updatedAt',
    'createdAt'])
    .not().exists()
    .withMessage('Server generated values not allowed'),
  // Required Body Keys
  body([
    '_csrf',
    'name',
    'clientId',
    'clientSecret',
    'allowedScope',
    'allowedRedirectURI'])
    .exists()
    .withMessage('Required value'),
  //
  // Validate Required keys
  //
  body('name')
    .isLength({ min: config.data.clientNameMinLength, max: config.data.clientNameMaxLength })
    .withMessage('Invalid string length'),
  body('name')
    .isWhitelisted(nameAllowedChars)
    .withMessage('Invalid characters in string'),
  body('clientId')
    .isLength({ min: config.data.clientIdMinLength, max: config.data.clientIdMaxLength })
    .withMessage('Invalid string length'),
  body('clientId')
    .isWhitelisted(idAllowedChars)
    .withMessage('Invalid characters in string'),
  // length also checked in admin-panel.js, this is general input validation
  body('clientSecret')
    .isLength({ min: 0, max: 1024 })
    .withMessage('Invalid string length'),
  body('trustedClient')
    .optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('allowedScope')
    .isLength({ max: config.data.allScopesMaxLength })
    .withMessage('Invalid string length'),
  body('allowedScope')
    .isWhitelisted(scopeAllowedChars)
    .withMessage('Invalid characters in string'),
  body('allowedRedirectURI')
    .isLength({ max: config.data.allScopesMaxLength })
    .withMessage('Invalid string length'),
  body('allowedRedirectURI')
    .isWhitelisted(uriAllowedChars)
    .withMessage('Invalid characters in string'),
  handleErrorHTTP
]; // createClient

/**
 * Edit Client POST request
 *
 * Array of middleware functions for input validation
 */
exports.editClient = [
  checkExtraneousKeys([
    '_csrf',
    'id',
    'name',
    'clientSecret',
    'trustedClient',
    'allowedScope',
    'allowedRedirectURI'], 'body'),
  // Forbidden body keys
  body([
    'clientId'])
    .not().exists()
    .withMessage('Forbidden property (read only'),
  body([
    'updatedAt',
    'createdAt'])
    .not().exists()
    .withMessage('Server generated values not allowed'),
  // Required Body Keys
  body([
    '_csrf',
    'id',
    'name',
    'clientSecret',
    'allowedScope',
    'allowedRedirectURI'])
    .exists()
    .withMessage('Required value'),
  //
  // Validate Required keys
  //
  body('id')
    .isUUID(4)
    .withMessage('Invalid UUID.v4'),
  body('name')
    .isLength({ min: config.data.clientNameMinLength, max: config.data.clientNameMaxLength })
    .withMessage('Invalid string length'),
  body('name')
    .isWhitelisted(nameAllowedChars)
    .withMessage('Invalid characters in string'),
  // length also checked in admin-panel.js, this is general input validation
  body('clientSecret')
    .isLength({ min: 0, max: 1024 })
    .withMessage('Invalid string length'),
  body('trustedClient')
    .optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('allowedScope')
    .isLength({ max: config.data.allScopesMaxLength })
    .withMessage('Invalid string length'),
  body('allowedScope')
    .isWhitelisted(scopeAllowedChars)
    .withMessage('Invalid characters in string'),
  body('allowedRedirectURI')
    .isLength({ max: config.data.allScopesMaxLength })
    .withMessage('Invalid string length'),
  body('allowedRedirectURI')
    .isWhitelisted(uriAllowedChars)
    .withMessage('Invalid characters in string'),
  handleErrorHTTP
]; // editClient

/**
 * Authorization GET request with query parameters in URL at /dialog/authorize
 *
 * Array of middleware functions for input validation
 */
exports.dialogAuthorization = [
  checkExtraneousKeys([
    'redirect_uri',
    'response_type',
    'client_id',
    'scope',
    'state'], 'query'),
  // Required Query Keys
  query([
    'redirect_uri',
    'response_type',
    'client_id',
    'scope'])
    .exists()
    .withMessage('Required query value'),
  query('response_type')
    .custom(function (value, { req }) {
      if ((value === 'token') && (config.oauth2.disableTokenGrant)) {
        throw new Error('response_type token (implicit grant) is disabled');
      }
      if ((value === 'code') && (config.oauth2.disableCodeGrant)) {
        throw new Error('response_type code (code grant) is disabled');
      }
      if ((value !== 'code') && (value !== 'token')) {
        throw new Error('Invalid OAuth2 response_type');
      }
      return true;
    }),
  handleErrorOauth
];

/**
 * Decision POST request with query parameters in URL at /dialog/authorize/decision
 *
 * Array of middleware functions for input validation
 */
exports.dialogAuthDecision = [
  checkExtraneousKeys([
    '_csrf',
    'cancel',
    'transaction_id'], 'body'),
  body('transaction_id')
    .exists()
    .withMessage('Required value'),
  body('transaction_id')
    .isLength({ min: 1, max: 64 })
    .withMessage('Invalid string length'),
  handleErrorOauth
];

/**
 * Token Request POST request /oauth/token
 *
 *                client code pass token refresh
 *  grant_type       x     x    x          x
 *  scope            x          x
 *  username                    x
 *  password                    x
 *  client_id        x     x    x          x
 *  client_secret    x     x    x          x
 *  code                   x
 *  redirect_uri           x               x
 *  refresh_token                          x
 *
 * Alternately: client_id and client_secret can be
 * supplied as base64 Basic authorization header.
 */
exports.oauthToken = [
  checkExtraneousKeys([
    'grant_type',
    'scope',
    'username',
    'password',
    'client_id',
    'client_secret',
    'code',
    'redirect_uri',
    'refresh_token'], 'body'),
  // TODO more validation advisable
  body('grant_type')
    .custom(function (value, { req }) {
      if ((value === 'authorization_code') && (config.oauth2.disableCodeGrant)) {
        throw new Error('grant_type code (code grant) is disabled');
      }
      if ((value === 'client_credentials') && (config.oauth2.disableClientGrant)) {
        throw new Error('grant_type client_credentials (client grant) is disabled');
      }
      if ((value === 'password') && (config.oauth2.disablePasswordGrant)) {
        throw new Error('grant_type password (password grant) is disabled');
      }
      if ((value === 'refresh_token') && (config.oauth2.disableRefreshTokenGrant)) {
        throw new Error('grant_type refresh_token (Refresh token grant) is disabled');
      }
      if ((value !== 'authorization_code') &&
        (value !== 'client_credentials') &&
        (value !== 'password') &&
        (value !== 'refresh_token')) {
        throw new Error('Invalid OAuth2 grant_type');
      }
      return true;
    }),
  body('refresh_token')
    .optional()
    .isJWT()
    .withMessage('Invalid JWT Token'),
  handleErrorOauth
];

/**
 * Token Revoke POST request /oauth/token/revoke
 *
 * Array of middleware functions for input validation
 */
exports.oauthTokenRevoke = [
  checkExtraneousKeys([
    'access_token',
    'refresh_token',
    'client_id',
    'client_secret'], 'body'),
  body('access_token')
    .optional()
    .isJWT()
    .withMessage('Invalid JWT Token'),
  body('refresh_token')
    .optional()
    .isJWT()
    .withMessage('Invalid JWT Token'),
  handleErrorOauth
];

/**
 * Token introspect POST request /oauth/introspect
 *
 * Array of middleware functions for input validation
 */
exports.oauthIntrospect = [
  checkExtraneousKeys([
    'access_token',
    'client_id',
    'client_secret'], 'body'),
  body('access_token')
    .exists()
    .withMessage('Required values'),
  body('access_token')
    .isJWT()
    .withMessage('Invalid JWT Token'),
  handleErrorOauth
];
