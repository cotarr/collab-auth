'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const pgPool = require('./pg-pool');

exports.find = (id) => {
  const query = {
    text: 'SELECT * FROM authclients WHERE "id" = $1 AND "deleted" = FALSE',
    values: [id]
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.findByClientId = (clientId) => {
  const query = {
    text: 'SELECT * FROM authclients WHERE "clientId" = $1 AND "deleted" = FALSE',
    values: [clientId]
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.findAll = () => {
  const query = {
    text: 'SELECT * FROM authclients WHERE "deleted" = FALSE'
  };
  // Return Promise
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

if (debuglog) {
  exports.debug = () => {
    pgPool.query('SELECT * FROM authclients')
      .then((queryResponse) => {
        console.log('clients\n', queryResponse.rows);
      })
      .catch((err) => {
        console.error(err.stack);
      });
  };
};

// exports.find('dd2e3a2e-b7a0-4eeb-9325-bbb0f69be1f5')
// // exports.findByClientId('abc123')
// // exports.findAll()
//   .then((client) => {
//     console.log('client find', client);
//   })
//   .catch((err) => {
//     console.log(err);
//   });
