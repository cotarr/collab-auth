'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const jwt = require('jsonwebtoken');
const pgPool = require('./pg-pool');

/*
CREATE TABLE accesstokens (
  "id" uuid PRIMARY KEY NOT NULL,
  "userID" uuid,
  "clientID" uuid NOT NULL,
  "scope" text[],
  "expirationDate" timestamp without time zone NOT NULL,
  "grantType" varchar(50),
  "authTime" timestamp without time zone
);
*/

exports.find = (token) => {
  if (debuglog) console.log('db.pg-accesstokens.find (called)');

  const id = jwt.decode(token).jti;

  // not found
  // const id = 'dd2e3a2e-b7a0-4eeb-9325-bbb0f69be1f5';

  const query = {
    text: 'SELECT "userID", "clientID", "expirationDate", "scope", "grantType", "authTime"' +
      ' FROM accesstokens WHERE id = $1',
    values: [id]
  };

  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.save = (token, expirationDate, userID, clientID, scope, grantType, authTime) => {
  if (debuglog) console.log('db.pg-accesstokens.save (entry)');

  const id = jwt.decode(token).jti;

  const query = {
    text: 'INSERT INTO accesstokens ' +
      '("id", "userID", "clientID", "expirationDate", "scope", "grantType", "authTime") ' +
      'VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING ' +
      '"userID", "clientID", "expirationDate", "scope", "grantType", "authTime"',
    values: [id, userID, clientID, expirationDate, scope, grantType, authTime]
  };

  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.delete = (token) => {
  if (debuglog) console.log('db.pg-accesstokens.delete (called)');
  const id = jwt.decode(token).jti;
  const query = {
    text: 'DELETE FROM accesstokens WHERE "id" = $1 RETURNING *',
    values: [id]
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.removeExpired = () => {
  if (debuglog) console.log('db.pg-accesstokens.delete (called)');
  const query = {
    text: 'DELETE FROM accesstokens WHERE "expirationDate" < now() RETURNING *'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

exports.removeAll = () => {
  if (debuglog) console.log('db.pg-accesstokens.removeAll (called)');
  const query = {
    text: 'DELETE FROM accesstokens RETURNING *'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

if (debuglog) {
  exports.debug = () => {
    pgPool.query('SELECT * FROM accesstokens')
      .then((queryResponse) => {
        console.log('accesstokens\n', queryResponse.rows);
      })
      .catch((err) => {
        console.error(err.stack);
      });
  };
};
