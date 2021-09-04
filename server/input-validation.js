//
// Form input validation using express-validator
//

'use strict';

const { validationResult } = require('express-validator');
const { query, body, param, check } = require('express-validator');

const config = require('./config/');

const nameIdAllowedChars =
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.-_@';
const scopeAllowedChars =
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.,_';
const uriAllowedChars =
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890:\\"\'/%._-?&';

const handleError = (req, res, next) => {
  const allErrors = [];

  // First, errors from express-validator
  const validatorErrors = validationResult(req).array();
  // console.log(validatorErrors);
  for (const err of validatorErrors) {
    allErrors.push(err);
  }
  // Second add custom errors from req.locals.errors
  if (!req.locals) req.locals = {};
  if (!req.locals.errors) req.locals.errors = [];
  const customErrors = req.locals.errors;

  // console.log(customErrors);
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
 * Create User POST request
 *
 * Array of middleware functions for input validation
 */
exports.createUser = [
  (req, res, next) => next()
]; // createUser
/**
 * Edit User POST request
 *
 * Array of middleware functions for input validation
 */
exports.editUser = [
  (req, res, next) => next()
]; // editUser

/**
 * Create Client POST request
 *
 * Array of middleware functions for input validation
 */
exports.createClient = [
  // (req, res, next) => {
  //   console.log('body ', req.body);
  //   next();
  // },

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
    .isWhitelisted(nameIdAllowedChars),
  body('clientId', 'Invalid string length')
    .isLength({ min: config.data.clientIdMinLength, max: config.data.clientIdMaxLength }),
  body('clientId', 'Invalid characters in string')
    .isWhitelisted(nameIdAllowedChars),
  body('clientSecret', 'Invalid string length')
    .isLength({ min: config.data.clientSecretMinLength, max: config.data.clientIdMaxLength }),
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
  // (req, res, next) => {
  //   console.log('body ', req.body);
  //   next();
  // },

  // Forbidden body keys
  body([
    'updatedAt',
    'createdAt'], 'Server generated values not allowed')
    .not().exists(),
  // Required Body Keys
  body([
    'id',
    'name',
    'clientId',
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
    .isWhitelisted(nameIdAllowedChars),
  body('clientId', 'Invalid string length')
    .isLength({ min: config.data.clientIdMinLength, max: config.data.clientIdMaxLength }),
  body('clientId', 'Invalid characters in string')
    .isWhitelisted(nameIdAllowedChars),
  body('clientSecret', 'Invalid string length')
    .isLength({ min: config.data.clientSecretMinLength, max: config.data.clientIdMaxLength }),
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
