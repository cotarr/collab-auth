'use strict';

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
