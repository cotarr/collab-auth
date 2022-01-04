'use strict';

/**
 * This is the configuration of the clients that are allowed to connected to your authorization
 * server. These represent client applications that can connect. At a minimum you need the required
 * properties of
 *
 * id:            A unique numeric id of your client application
 * name:          The name of your client application
 * clientId:      A unique id of your client application
 * clientSecret:  A unique password(ish) secret that is _best not_ shared with anyone but your
 *                client application and the authorization server.
 * trustedClient: default if missing is false. If this is set to true then the client is regarded
 *                as a trusted client and not a 3rd party application. That means that the user
 *                will not be presented with a decision dialog with the trusted application and
 *                that the trusted application gets full scope access without the user having
 *                to make a decision to allow or disallow the scope access.
 *
 * allowedScope: Array of scope strings
 * allowedRedirectURI Array of URL strings. Redirect URI must be in this list or error
 *                is generated.
 */

const pgPool = require('./pg-pool');

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   id - The unique id of the client to find
 * @returns {Promise}  resolved promise with the client if found, otherwise undefined
 */
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

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   clientId - The unique client id of the client to find
 * @returns {Promise} resolved promise with the client if found, otherwise undefined
 */
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

/**
 * Returns an array of client objects, otherwise returns empty array
 * @returns {Promise} resolved promise with the array if found, otherwise resolves empty array
 */
exports.findAll = () => {
  const query = {
    text: 'SELECT * FROM authclients WHERE "deleted" = FALSE'
  };
  return pgPool.query(query)
    .then((queryResponse) => {
      return queryResponse.rows;
    });
};

/**
 * Save a new client record to the database
 * @param   {Object}   client - Object containing client properties
 * @returns {Promise}  resolved promise with the client if found, otherwise throws error
 */
exports.save = (client) => {
  const cidQuery = {
    text: 'SELECT * FROM authclients WHERE "clientId" = $1 AND "deleted" = FALSE',
    values: [client.clientId]
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
          '"allowedRedirectURI",' +
          '"updatedAt", ' +
          '"createdAt") ' +
          'VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING *',
          values: [
            client.name,
            client.clientId,
            client.clientSecret,
            client.trustedClient,
            client.allowedScope,
            client.allowedRedirectURI
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
      if (queryResponse.rows[0] == null) {
        throw new Error('Error creating client record');
      } else {
        return queryResponse.rows[0];
      }
    });
};

/**
 * Modify an existing client record
 * @param   {Object}   client - Object containing modified client properties
 * @returns {Promise}  resolved promise with the modifiedclient, otherwise throws error
 */
exports.update = (client) => {
  let updateQuery;
  if ((client.clientSecret) && (client.clientSecret.length > 0)) {
    updateQuery = {
      text: 'UPDATE authclients SET ' +
        '"name" = $2, ' +
        '"clientSecret" = $3, ' +
        '"trustedClient" = $4, ' +
        '"allowedScope" = $5, ' +
        '"allowedRedirectURI" = $6, ' +
        '"updatedAt" = now() ' +
        'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
      values: [
        client.id,
        client.name,
        client.clientSecret,
        client.trustedClient,
        client.allowedScope,
        client.allowedRedirectURI
      ]
    };
  } else {
    updateQuery = {
      text: 'UPDATE authclients SET ' +
        '"name" = $2, ' +
        '"trustedClient" = $3, ' +
        '"allowedScope" = $4, ' +
        '"allowedRedirectURI" = $5, ' +
        '"updatedAt" = now() ' +
        'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
      values: [
        client.id,
        client.name,
        client.trustedClient,
        client.allowedScope,
        client.allowedRedirectURI
      ]
    };
  }
  return pgPool.query(updateQuery)
    .then((queryResponse) => {
      if (queryResponse.rows[0] == null) {
        throw new Error('Error modifying client record');
      } else {
        return queryResponse.rows[0];
      }
    });
};

/**
 * Delete a client record by marking property deleted = true
 * @param   {Object}   id - The id of the object to delete
 * @returns {Promise}  resolved promise with celeted client object, otherwise throws error
 */
exports.delete = (id) => {
  const query = {
    text: 'UPDATE authclients SET "deleted" = TRUE ' +
      'WHERE "id" = $1 AND "deleted" = FALSE RETURNING *',
    values: [id]
  };
  return pgPool.query(query)
    .then((queryResponse) => {
      if (queryResponse.rows[0] == null) {
        throw new Error('Error deleting client record');
      } else {
        return queryResponse.rows[0];
      }
    });
};
