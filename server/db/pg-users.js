'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const pgPool = require('./pg-pool');

exports.find = (id) => {
  const query = {
    text: 'SELECT * FROM authusers WHERE "id" = $1 AND "deleted" = FALSE',
    values: [id]
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.findByUsername = (username) => {
  const query = {
    text: 'SELECT * FROM authusers WHERE "username" = $1 AND "deleted" = FALSE',
    values: [username]
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.findAll = () => {
  const query = {
    text: 'SELECT * FROM authusers WHERE "deleted" = FALSE'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

exports.updateLoginTime = (user) => {
  const query = {
    text: 'UPDATE authusers SET "lastLogin" = NOW() ' +
      'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
    values: [user.id]
  };
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

if (debuglog) {
  exports.debug = () => {
    pgPool.query('SELECT * FROM authusers')
      .then((queryResponse) => {
        console.log('users\n', queryResponse.rows);
      })
      .catch((err) => {
        console.error(err.stack);
      });
  };
};

// exports.find('a7b06a6d-7538-45c8-bb5f-b107a8258c7d')
// // exports.findByUsername('bob')
// // exports.findAll()
// // exports.updateLoginTime({ id: 'a7b06a6d-7538-45c8-bb5f-b107a8258c7d' })
//   .then((client) => {
//     console.log('user find', client);
//   })
//   .catch((err) => {
//     console.log(err);
//   });
