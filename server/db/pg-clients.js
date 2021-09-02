'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const pgPool = require('./pg-pool');

exports.find = (id) => {
  const query = {
    text: 'SELECT * FROM authclients WHERE "id" = $1 AND "deleted" = FALSE',
    values: [id]
  };
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
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

exports.save = (user) => {
  const cidQuery = {
    text: 'SELECT * FROM authclients WHERE "clientId" = $1 AND "deleted" = FALSE',
    values: [user.clientId]
  };
  return pgPool.query(cidQuery)
    .then((foundClient) => {
      if (foundClient.rows.length === 0) {
        const saveQuery = {
          text: 'INSERT INTO authclients (' +
          '"name",' +
          '"clientId",' +
          '"clientSecret",' +
          '"trustedClient",' +
          '"allowedScope",' +
          '"defaultScope",' +
          '"allowedRedirectURI",' +
          '"createdAt","updatedAt") ' +
          'VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now()) RETURNING *',
          values: [
            user.name,
            user.clientId,
            user.clientSecret,
            user.trustedClient,
            user.allowedScope,
            user.defaultScope,
            user.allowedRedirectURI
          ]
        };
        return pgPool.query(saveQuery);
      } else {
        const err = new Error('clientId already exists');
        err.status = 400;
        throw err;
      }
    })
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.update = (user) => {
  const updateQuery = {
    text: 'UPDATE authclients SET ' +
      '"name" = $1, ' +
      '"clientSecret" = $2, ' +
      '"trustedClient" = $3, ' +
      '"allowedScope" = $4, ' +
      '"defaultScope" = $5, ' +
      '"allowedRedirectURI" = $6, ' +
      '"updatedAt" = now() ' +
      'WHERE "id" = $7 AND "deleted" = FALSE RETURNING *',
    values: [
      user.name,
      user.clientSecret,
      user.trustedClient,
      user.allowedScope,
      user.defaultScope,
      user.allowedRedirectURI,
      user.id
    ]
  };
  return pgPool.query(updateQuery)
    .then((queryResponse) => {
      return queryResponse.rows[0];
    });
};

exports.delete = (id) => {
  const query = {
    text: 'UPDATE authclients SET "deleted" = TRUE ' +
      'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
    values: [id]
  };
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows[0];
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
