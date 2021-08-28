'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const jwt = require('jsonwebtoken');
const pgPool = require('./pg-pool');

/*
CREATE TABLE refreshtokens (
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
  if (debuglog) console.log('db.pg-refreshtokens.find (called)');

  const id = jwt.decode(token).jti;

  // not found
  // const id = 'dd2e3a2e-b7a0-4eeb-9325-bbb0f69be1f5';

  const query = {
    text: 'SELECT "userID", "clientID", "expirationDate", "scope", "grantType", "authTime"' +
      ' FROM refreshtokens WHERE id = $1',
    values: [id]
  };

  // Return Promise
  return pgPool.query(query)
    .then((response) => {
      if (debuglog) console.log('    pg find ' + response.rows[0]);
      return response.rows[0];
    });
};

exports.save = (token, expirationDate, userID, clientID, scope, grantType, authTime) => {
  if (debuglog) console.log('db.pg-refreshtokens.save (entry)');

  const id = jwt.decode(token).jti;

  const query = {
    text: 'INSERT INTO refreshtokens ' +
      '("id", "userID", "clientID", "expirationDate", "scope", "grantType", "authTime") ' +
      'VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING ' +
      '"userID", "clientID", "expirationDate", "scope", "grantType", "authTime"',
    values: [id, userID, clientID, expirationDate, scope, grantType, authTime]
  };

  // Return Promise
  return pgPool.query(query);
};

exports.delete = (token) => {
  if (debuglog) console.log('db.pg-refreshtokens.delete (called)');
  const id = jwt.decode(token).jti;
  const query = {
    text: 'DELETE FROM refreshtokens WHERE "id" = $1 RETURNING *',
    values: [id]
  };
  // Return Promise
  return pgPool.query(query);
};

exports.removeExpired = () => {
  if (debuglog) console.log('db.pg-refreshtokens.delete (called)');
  const query = {
    text: 'DELETE FROM refreshtokens WHERE "expirationDate" < now() RETURNING *'
  };
  // Return Promise
  return pgPool.query(query);
};

exports.removeAll = () => {
  if (debuglog) console.log('db.pg-refreshtokens.removeAll (called)');
  const query = {
    text: 'DELETE FROM refreshtokens RETURNING *'
  };
  // Return Promise
  return pgPool.query(query);
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
