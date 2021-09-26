'use strict';

const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const jwt = require('jsonwebtoken');

// const config = require('./config/');

/** Private certificate used for signing JSON WebTokens */
const privateKey = fs.readFileSync(path.join(__dirname, '../data/token-certs/privatekey.pem'));

/** Public certificate used for verification.  Note: you could also use the private key */
const publicKey = fs.readFileSync(path.join(__dirname, '../data/token-certs/certificate.pem'));

/**
 * Creates a signed JSON WebToken and returns it.  Utilizes the private certificate to create
 * the signed JWT.  For more options and other things you can change this to, please see:
 * https://github.com/auth0/node-jsonwebtoken
 *
 * payload.exp - (Optional) seconds to token expiration time
 * payload.sub - Subject, user ID (UUID), or if client token, client ID (UUID)
 * payload.jti - Json Token ID (UUID generated here)
 *
 * @param  {Object} payload JWT Token payload
 * @return {String} The JWT Token
 */
exports.createToken = (payload) => {
  const payloadData = {
    jti: uuid.v4(),
    sub: payload.sub
  };
  const token = jwt.sign(
    payloadData,
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: payload.exp
    }
  );
  return token;
};

/**
 * Verifies the token through the jwt library using the public certificate.
 * @param   {String} token - The token to verify
 * @throws  {Error} Error if the token could not be verified
 * @returns {Object} The token decoded and verified
 */
exports.verifyToken = (token) => jwt.verify(token, publicKey);

/**
 * Decode JWT token
 * @param   {String} token - The token to verify
 * @throws  {Error} Error if the token could not be decoded
 * @returns {Object} The token decoded and verified
 */
exports.decodeToken = (token) => jwt.decode(token);
