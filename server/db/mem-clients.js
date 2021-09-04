'use strict';

/**
 * This is the configuration of the clients that are allowed to connected to your authorization
 * server. These represent client applications that can connect. At a minimum you need the required
 * properties of
 *
 * id:           A unique numeric id of your client application
 * name:         The name of your client application
 * clientId:     A unique id of your client application
 * clientSecret: A unique password(ish) secret that is _best not_ shared with anyone but your
 *               client application and the authorization server.
 * allowedScope  Array of scope strings
 * allowedRedirectURI Array of URL strings. Redirect URI must be in this list or error is generated.
 *
 * trustedClient: default if missing is false. If this is set to true then the client is regarded
 * as a trusted client and not a 3rd party application. That means that the user will not be
 * presented with a decision dialog with the trusted application and that the trusted application
 * gets full scope access without the user having to make a decision to allow or disallow the scope
 * access.
 */

const fs = require('fs');
const uuid = require('uuid');

let clients = [];

try {
  clients = JSON.parse(fs.readFileSync('./clients-db.json', 'utf8'));
} catch (e) {
  console.log(e.message);
  process.exit(1);
}
// convert dates from ISO string to JS Date.
clients.forEach((client) => {
  client.createdAt = new Date(Date(client.createdAt));
  client.updatedAt = new Date(Date(client.updatedAt));
});

// console.log(JSON.stringify(clients, null, 2));

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   id   - The unique id of the client to find
 * @returns {Promise}  resolved promise with the client if found, otherwise undefined
 */
exports.find = (id) => {
  try {
    let client = clients.find((client) => client.id === id);
    // make sure database remains immutable on emulated read
    if (client) {
      client = JSON.parse(JSON.stringify(client));
      client.updatedAt = new Date(client.updatedAt);
      client.createdAt = new Date(client.createdAt);
    }
    return Promise.resolve(client);
  } catch (err) {
    return Promise.resolve(undefined);
  }
};

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   clientId - The unique client id of the client to find
 * @returns {Promise} resolved promise with the client if found, otherwise undefined
 */
exports.findByClientId = (clientId) => {
  try {
    let client = clients.find((client) => client.clientId === clientId);
    // make sure database remains immutable on emulated read
    if (client) {
      client = JSON.parse(JSON.stringify(client));
      client.updatedAt = new Date(client.updatedAt);
      client.createdAt = new Date(client.createdAt);
    }
    return Promise.resolve(client);
  } catch (err) {
    return Promise.resolve(undefined);
  }
};

/**
 * Returns an array of client objects, otherwise returns empty array
 * @returns {Promise} resolved promise with the array if found, otherwise error
 */
exports.findAll = () => {
  return new Promise((resolve, reject) => {
    const error = false;
    if (!error) {
      // Keep memory database immutable
      const clients2 = JSON.parse(JSON.stringify(clients));
      clients2.forEach((client) => {
        client.updatedAt = new Date(client.updatedAt);
        client.createdAt = new Date(client.createdAt);
      });
      resolve(clients2);
    } else {
      reject(error);
    }
  });
};

/**
 * Save a new client record to the database
 * @param   {Object}   client Object containing client properties
 * @returns {Promise}  resolved promise with the client if found, otherwise throws error
 */
exports.save = (client) => {
  return new Promise((resolve, reject) => {
    let err = false;
    const foundClient = clients.find((cli) => cli.clientId === client.clientId);
    if (!(foundClient == null)) {
      err = new Error('clientId already exists');
      err.status = 400;
      throw err;
    }
    if (!err) {
      client.id = uuid.v4();
      client.createdAt = new Date();
      client.updatedAt = new Date();
      clients.push(client);
      resolve(client);
    } else {
      reject(err);
    }
  });
};

/**
 * Modify an existing client record
 * @param   {Object}   client Object containing modified client properties
 * @returns {Promise}  resolved promise with the modified client, otherwise throws error
 */
exports.update = (client) => {
  return new Promise((resolve, reject) => {
    let err = false;
    const foundClient = clients.find((cli) => cli.id === client.id);
    if (foundClient == null) {
      err = new Error('client not found');
      err.status = 400;
      throw err;
    }
    if (!err) {
      foundClient.name = client.name;
      foundClient.clientSecret = client.clientSecret;
      foundClient.allowedScope = client.allowedScope;
      foundClient.allowedRedirectURI = client.allowedRedirectURI;
      foundClient.updatedAt = new Date();
      resolve(foundClient);
    } else {
      reject(err);
    }
  });
};

/**
 * Delete a client record
 * @param   {Object}   id The id of the object to delete
 * @returns {Promise}  resolved promise with celeted client object, otherwise throws error
 */
exports.delete = (id) => {
  return new Promise((resolve, reject) => {
    let err = false;
    let arrayIndex = -1;
    if (clients.length > 0) {
      for (let i = 0; i < clients.length; i++) {
        if (clients[i].id === id) arrayIndex = i;
      }
    }
    if (arrayIndex === -1) {
      err = new Error('client not found');
      err.status = 400;
      throw err;
    }
    if (!err) {
      resolve(clients.splice(arrayIndex, 1));
    } else {
      reject(err);
    }
  });
};
