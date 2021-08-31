'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const jwt = require('jsonwebtoken');
const pgPool = require('./pg-pool');

exports.find = (token) => {
  const id = jwt.decode(token).jti;

  const query = {
    text: 'SELECT * FROM refreshtokens WHERE id = $1',
    values: [id]
  };

  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.save = (token, expirationDate, userID, clientID, scope, grantType, authTime) => {
  const id = jwt.decode(token).jti;

  const query = {
    text: 'INSERT INTO refreshtokens ' +
      '("id", "userID", "clientID", "expirationDate", "scope", "grantType", "authTime") ' +
      'VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    values: [id, userID, clientID, expirationDate, scope, grantType, authTime]
  };

  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.delete = (token) => {
  const id = jwt.decode(token).jti;
  const query = {
    text: 'DELETE FROM refreshtokens WHERE "id" = $1 RETURNING *',
    values: [id]
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.removeExpired = () => {
  const query = {
    text: 'DELETE FROM refreshtokens WHERE "expirationDate" < now() RETURNING *'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

exports.removeAll = () => {
  const query = {
    text: 'DELETE FROM refreshtokens RETURNING *'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

if (debuglog) {
  exports.debug = () => {
    pgPool.query('SELECT * FROM refreshtokens')
      .then((response) => {
        console.log('refreshtokens\n', response.rows);
      })
      .catch((err) => {
        console.error(err.stack);
      });
  };
};
