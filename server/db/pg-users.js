'use strict';

const pgPool = require('./pg-pool');

/**
 * This is the configuration of the users that are allowed to connected to your authorization
 * server. These represent users of different client applications that can connect to the
 * authorization server. At a minimum you need the required properties of
 *
 * id       : A unique numeric id of your user
 * username : The user name of the user
 * password : The password of your user
 * name     : The name of your user
 */

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   id - The unique id of the user to find
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */
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
/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   username - The unique user name to find
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */
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

/**
 * Returns an array of all users
 * @returns {Promise} resolved array if found, otherwise resolves emtpy array
 */
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

/**
 * Updates the lastLogin column of user record to the current date/time
 * @returns {Promise} resolved to modified user, otherwise resolves undefined
 */
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

/**
 * Save a new user record to the database
 * @param   {Object}   user Object containing new created user properties
 * @returns {Promise}  resolved promise created use, otherwise user exist throws error
 */
exports.save = (user) => {
  const uidQuery = {
    text: 'SELECT * FROM authusers WHERE "username" = $1 AND "deleted" = FALSE',
    values: [user.username]
  };
  return pgPool.query(uidQuery)
    .then((foundUser) => {
      if (foundUser.rows.length === 0) {
        const saveQuery = {
          text: 'INSERT INTO authusers (' +
          '"username",' +
          '"password",' +
          '"name",' +
          '"loginDisabled",' +
          '"role", ' +
          '"lastLogin", ' +
          '"updatedAt", ' +
          '"createdAt") ' +
          'VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING *',
          values: [
            user.username,
            user.password,
            user.name,
            user.loginDisabled,
            user.role,
            null
          ]
        };
        return pgPool.query(saveQuery);
      } else {
        const err = new Error('username already exists');
        err.status = 400;
        throw err;
      }
    })
    .then((queryResponse) => {
      if (queryResponse.rows[0] == null) {
        throw new Error('Error creating user record');
      } else {
        return queryResponse.rows[0];
      }
    });
};

/**
 * Modify an existing user record
 * @param   {Object}   user Object containing modified user properties
 * @returns {Promise}  resolved promise with the modified user, otherwise throws error
 */
exports.update = (user) => {
  let updateQuery;
  if ((user.password) && (user.password.length > 0)) {
    updateQuery = {
      text: 'UPDATE authusers SET ' +
        '"password" = $2, ' +
        '"name" = $3,' +
        '"loginDisabled" = $4, ' +
        '"role" = $5, ' +
        '"updatedAt" = now() ' +
        'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
      values: [
        user.id,
        user.password,
        user.name,
        user.loginDisabled,
        user.role
      ]
    };
  } else {
    updateQuery = {
      text: 'UPDATE authusers SET ' +
        '"name" = $2, ' +
        '"loginDisabled" = $3, ' +
        '"role" = $4, ' +
        '"updatedAt" = now() ' +
        'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
      values: [
        user.id,
        user.name,
        user.loginDisabled,
        user.role
      ]
    };
  }
  return pgPool.query(updateQuery)
    .then((queryResponse) => {
      if (queryResponse.rows[0] == null) {
        throw new Error('Error modifying user record');
      } else {
        return queryResponse.rows[0];
      }
    });
};

exports.updatePassword = (id, password) => {
  const updateQuery = {
    text: 'UPDATE authusers SET ' +
      '"password" = $2, ' +
      '"updatedAt" = now() ' +
      'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
    values: [
      id,
      password
    ]
  };
  return pgPool.query(updateQuery)
    .then((queryResponse) => {
      if (queryResponse.rows[0] == null) {
        throw new Error('User record not found');
      } else {
        return queryResponse.rows[0];
      }
    });
};

/**
 * Delete a user record by marking property deleted = true
 * @param   {Object}   id The id of the object to delete
 * @returns {Promise}  resolved promise with celeted user object, otherwise throws error
 */
exports.delete = (id) => {
  const query = {
    text: 'UPDATE authusers SET "deleted" = TRUE ' +
      'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
    values: [id]
  };
  return pgPool.query(query)
    .then((queryResponse) => {
      if (queryResponse.rows[0] == null) {
        throw new Error('Error deleting user record');
      } else {
        return queryResponse.rows[0];
      }
    });
};
