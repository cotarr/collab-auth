'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

// The authorization codes.
// You will use these to get the access codes to get to the data in your endpoints as outlined
// in the RFC The OAuth 2.0 Authorization Framework: Bearer Token Usage
// (http://tools.ietf.org/html/rfc6750)

/**
 * Authorization codes in-memory data structure which stores all of the authorization codes
 */
let codes = Object.create(null);

/**
 * Returns an authorization code if it finds one, otherwise returns null if one is not found.
 * @param   {String}  code - Theauthorization code to find.
 * @returns {Promise} resolved with the authorization code if found, otherwise undefined
 */
exports.find = (code) => {
  if (debuglog) console.log('db.authorizationcodes.find (called)');
  try {
    return Promise.resolve(codes[code]);
  } catch (error) {
    return Promise.resolve(undefined);
  }
};

/**
 * Saves a authorization code, client id, redirect uri, user id, expiration date, and scope.
 * @param   {String}  code           - The authorization code (required)
 * @param   {String}  clientID       - The client ID (required)
 * @param   {String}  redirectURI    - The redirect URI of where to send access tokens once exchanged
 * @param   {String}  userID         - The user ID (required)
 * @param   {Number}  expirationDate - The code expiration milliseconds
 * @param   {String}  scope          - The scope (optional)
 * @returns {Promise} resolved with the saved token
 */
exports.save = (code, clientID, redirectURI, userID, expirationDate, scope) => {
  if (debuglog) console.log('db.authorizationcodes.save (entry)');
  codes[code] = { clientID, redirectURI, userID, expirationDate, scope };
  if (debuglog) {
    // console.log('    code: ' + code);
    // console.log('    clientID: ' + clientID);
    // console.log('    redirectURI: ' + redirectURI);
    // console.log('    userID: ' + userID);
    // console.log('    scope: ' + JSON.stringify(scope));
    console.log('    Save: \n' + code + ' ' + JSON.stringify(codes[code], null, 2));
  }
  if (debuglog) console.log('db.authorizationcodes.save (finished)');
  return Promise.resolve(codes[code]);
};

/**
 * Deletes an authorization code
 * @param   {String}  code - The authorization code to delete
 * @returns {Promise} resolved with the deleted value
 */
exports.delete = (code) => {
  if (debuglog) console.log('db.authorizationcodes.delete (called)');
  try {
    const deletedToken = codes[code];
    delete codes[code];
    return Promise.resolve(deletedToken);
  } catch (error) {
    return Promise.resolve(undefined);
  }
};

/**
 * Removes expired authorization codes. It does this by looping through them all and then removing the
 * expired ones it finds.
 * @returns {Promise} resolved with an associative of codes that were expired
 */
exports.removeExpired = () => {
  if (debuglog) console.log('db.authorizationcodes.removeExpired (called)');
  const keys = Object.keys(codes);
  const expired = keys.reduce((accumulator, key) => {
    if (new Date() > codes[key].expirationDate) {
      const expiredToken = codes[key];
      delete codes[key];
      accumulator[key] = expiredToken; // eslint-disable-line no-param-reassign
    }
    return accumulator;
  }, Object.create(null));
  return Promise.resolve(expired);
};

/**
 * Removes all authorization codes.
 * @returns {Promise} resolved with all removed authorization codes returned
 */
exports.removeAll = () => {
  if (debuglog) console.log('db.authorizationcodes.removeAll (called)');
  const deletedTokens = codes;
  codes = Object.create(null);
  return Promise.resolve(deletedTokens);
};

if (debuglog) {
  exports.debug = () => {
    console.log('authorizationcodes\n' + JSON.stringify(codes, null, 2));
  };
}
