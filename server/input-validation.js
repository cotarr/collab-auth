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
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890:\\"\'/%._-?&';

/**
 * Middleware error handler
 */
const handleError = (req, res, next) => {
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
 * Change user password POST request
 *
 * Array of middleware functions for input validation
 */
exports.loginRequest = [
  // Required Body Keys
  body([
    'username',
    'password'], 'Required values')
    .exists(),
  //
  // Validate Required keys
  //
  body('username', 'Invalid string length')
    .isLength({ min: config.data.userUsernameMinLength, max: config.data.userUsernameMaxLength }),
  body('username', 'Invalid characters in string')
    .isWhitelisted(idAllowedChars),
  body('password', 'Invalid string length')
    .isLength({ min: config.data.userNameMinLength, max: config.data.userPasswordMaxLength }),
  handleError
]; // Change Password

/**
 * Validate input for ?id=UUID.v4
 */
exports.viewByUUID = [
  query(['id'], 'Required values').exists(),
  query('id', 'Invalid UUID.v4').isUUID(4),
  handleError
]; // viewByUUID

/**
 * Validate input for ?id=UUID.v4
 */
exports.deleteByUUID = [
  query(['id'], 'Required values').exists(),
  query('id', 'Invalid UUID.v4').isUUID(4),
  handleError
]; // deleteByUUID

/**
 * Create User POST request
 *
 * Array of middleware functions for input validation
 */
exports.createUser = [
  // Forbidden body keys
  body([
    'id',
    'updatedAt',
    'createdAt'], 'Server generated values not allowed')
    .not().exists(),
  // Required Body Keys
  body([
    'username',
    'newpassword1',
    'name',
    'role'], 'Required values')
    .exists(),
  //
  // Validate Required keys
  //
  body('name', 'Invalid string length')
    .isLength({ min: config.data.userNameMinLength, max: config.data.userNameMaxLength }),
  body('name', 'Invalid characters in string')
    .isWhitelisted(nameAllowedChars),
  body('username', 'Invalid string length')
    .isLength({ min: config.data.userUsernameMinLength, max: config.data.userUsernameMaxLength }),
  body('username', 'Invalid characters in string')
    .isWhitelisted(idAllowedChars),
  body('newpassword1',
    'Password minimum ' + config.data.userPasswordMinLength.toString() + ' characters')
    .isLength({ min: config.data.userPasswordMinLength }),
  body('newpassword1', 'Invalid string length')
    .isLength({ max: config.data.userPasswordMaxLength }),
  body('loginDisabled').optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('role', 'Invalid string length')
    .isLength({ max: config.data.allScopesMaxLength }),
  body('role', 'Invalid characters in string')
    .isWhitelisted(scopeAllowedChars),
  // handle errors
  handleError
]; // createUser

/**
 * Edit User POST request
 *
 * Array of middleware functions for input validation
 */
exports.editUser = [
  // Forbidden body keys
  body([
    'updatedAt',
    'createdAt'], 'Server generated values not allowed')
    .not().exists(),
  // Required Body Keys
  body([
    'id',
    'newpassword1',
    'name',
    'role'], 'Required values')
    .exists(),
  //
  // Validate Required keys
  //
  body('id').isUUID(4),
  body('name', 'Invalid string length')
    .isLength({ min: config.data.userNameMinLength, max: config.data.userNameMaxLength }),
  body('name', 'Invalid characters in string')
    .isWhitelisted(nameAllowedChars),
  body('newpassword1').optional()
    .custom(function (value, { req }) {
      if ((value) && (value.length > 0)) {
        if (!req.body.newpassword2 || (req.body.newpassword2.length === 0)) {
          throw new Error('New password requires two entries');
        }
        if (value.length !== req.body.newpassword2.length) {
          throw new Error('Password mismatch');
        }
        if (value !== req.body.newpassword2) {
          throw new Error('Password mismatch');
        }
        if (value.length < config.data.userPasswordMinLength) {
          throw new Error(
            'Password minimum ' + config.data.userPasswordMinLength.toString() + ' characters');
        }
        if (value.length > config.data.userPasswordMaxLength) {
          throw new Error('Invalid string length');
        }
      }
      return true;
    }),
  body('newpassword2').optional()
    .custom(function (value, { req }) {
      if ((value) && (value.length > 0)) {
        if ((!req.body.newpassword1) || (req.body.newpassword1.length === 0)) {
          throw new Error('New password requires two entries');
        }
      }
      return true;
    }),
  body('loginDisabled').optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('oole', 'Invalid string length')
    .isLength({ max: config.data.allScopesMaxLength }),
  body('role', 'Invalid characters in string')
    .isWhitelisted(scopeAllowedChars),
  // handle errors
  handleError
]; // editUser

/**
 * Change user password POST request
 *
 * Array of middleware functions for input validation
 */
exports.changePassword = [
  // Required Body Keys
  body([
    'username',
    'oldpassword',
    'newpassword1',
    'newpassword2'], 'Required values')
    .exists(),
  //
  // Validate Required keys
  //
  body('username', 'Invalid string length')
    .isLength({ min: config.data.userUsernameMinLength, max: config.data.userUsernameMaxLength }),
  body('username', 'Invalid characters in string')
    .isWhitelisted(idAllowedChars),
  body('oldpassword', 'Invalid string length')
    .isLength({ min: config.data.userNameMinLength, max: config.data.userPasswordMaxLength }),
  body('newpassword1')
    .custom(function (value, { req }) {
      if ((value) && (value.length > 0)) {
        if (!req.body.newpassword2 || (req.body.newpassword2.length === 0)) {
          throw new Error('New password requires two entries');
        }
        if (value.length !== req.body.newpassword2.length) {
          throw new Error('Password mismatch');
        }
        if (value !== req.body.newpassword2) {
          throw new Error('Password mismatch');
        }
        if (value.length < config.data.userPasswordMinLength) {
          throw new Error(
            'Password minimum ' + config.data.userPasswordMinLength.toString() + ' characters');
        }
        if (value.length > config.data.userPasswordMaxLength) {
          throw new Error('Invalid string length');
        }
        // Check for repeat passwords disabled
        if ((req.body.oldpassword) && (value === req.body.oldpassword)) {
          throw new Error('New password must be different');
        }
      }
      return true;
    }),
  body('newpassword2', 'Invalid string length')
    .isLength({ min: config.data.userNameMinLength, max: config.data.userPasswordMaxLength }),
  // handle errors
  handleError
]; // Change Password

/**
 * Create Client POST request
 *
 * Array of middleware functions for input validation
 */
exports.createClient = [
  // Forbidden body keys
  body([
    'id',
    'updatedAt',
    'createdAt'], 'Server generated values not allowed')
    .not().exists(),
  // Required Body Keys
  body([
    'name',
    'clientId',
    'clientSecret',
    'allowedScope',
    'allowedRedirectURI'], 'Required values')
    .exists(),
  //
  // Validate Required keys
  //
  body('name', 'Invalid string length')
    .isLength({ min: config.data.clientNameMinLength, max: config.data.clientNameMaxLength }),
  body('name', 'Invalid characters in string')
    .isWhitelisted(nameAllowedChars),
  body('clientId', 'Invalid string length')
    .isLength({ min: config.data.clientIdMinLength, max: config.data.clientIdMaxLength }),
  body('clientId', 'Invalid characters in string')
    .isWhitelisted(idAllowedChars),
  body('clientSecret',
    'Client Secret minimum ' + config.data.clientSecretMinLength.toString() + ' characters')
    .isLength({ min: config.data.clientSecretMinLength, max: config.data.clientIdMaxLength }),
  body('clientSecret', 'Invalid string length')
    .isLength({ max: config.data.clientIdMaxLength }),
  body('trustedClient').optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('allowedScope', 'Invalid string length')
    .isLength({ max: config.data.allScopesMaxLength }),
  body('allowedScope', 'Invalid characters in string')
    .isWhitelisted(scopeAllowedChars),
  body('allowedRedirectURI', 'Invalid string length')
    .isLength({ max: config.data.allScopesMaxLength }),
  body('allowedRedirectURI', 'Invalid characters in string')
    .isWhitelisted(uriAllowedChars),
  // handle errors
  handleError
]; // createClient

exports.editClient = [
  // Forbidden body keys
  body([
    'updatedAt',
    'createdAt'], 'Server generated values not allowed')
    .not().exists(),
  // Required Body Keys
  body([
    'id',
    'name',
    'clientSecret',
    'allowedScope',
    'allowedRedirectURI'], 'Required values')
    .exists(),
  //
  // Validate Required keys
  //
  body('id').isUUID(4),
  body('name', 'Invalid string length')
    .isLength({ min: config.data.clientNameMinLength, max: config.data.clientNameMaxLength }),
  body('name', 'Invalid characters in string')
    .isWhitelisted(nameAllowedChars),
  body('clientSecret',
    'Client Secret minimum ' + config.data.clientSecretMinLength.toString() + ' characters')
    .isLength({ min: config.data.clientSecretMinLength, max: config.data.clientIdMaxLength }),
  body('clientSecret', 'Invalid string length')
    .isLength({ max: config.data.clientIdMaxLength }),
  body('trustedClient').optional()
    .custom(function (value, { req }) {
      if ((value.toLowerCase() !== 'on') && (value.toLowerCase !== 'off')) {
        throw new Error('Checkbox requires on/off');
      }
      return true;
    }),
  body('allowedScope', 'Invalid string length')
    .isLength({ max: config.data.allScopesMaxLength }),
  body('allowedScope', 'Invalid characters in string')
    .isWhitelisted(scopeAllowedChars),
  body('allowedRedirectURI', 'Invalid string length')
    .isLength({ max: config.data.allScopesMaxLength }),
  body('allowedRedirectURI', 'Invalid characters in string')
    .isWhitelisted(uriAllowedChars),
  // handle errors
  handleError
]; // editClient

exports.dialogAuthorization = [
  // Required Query Keys
  query([
    'redirect_uri',
    'response_type',
    'client_id',
    'scope'], 'Required query values')
    .exists(),
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
  // handle errors
  handleError
];

exports.oauthToken = [
  // (req, res, next) => {
  //   console.log('body ', req.body);
  //   next();
  // },
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
  // handle errors
  handleError
];
