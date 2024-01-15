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

const fs = require('fs');
const uuid = require('uuid');

let clients = [];

try {
  clients = JSON.parse(fs.readFileSync('./clients-db.json', 'utf8'));
} catch (e) {
  console.log(e.message);
  process.exit(1);
}
clients.forEach((client) => {
  // Client account setting clientDisabled added in v0.0.23
  // If clientDisabled not in client-db.json file, add it, set to false
  if (!Object.hasOwn(client, 'clientDisabled')) {
    client.clientDisabled = false;
  }
  // convert dates from ISO string to JS Date.
  client.createdAt = new Date(Date(client.createdAt));
  client.updatedAt = new Date(Date(client.updatedAt));
});

// console.log(JSON.stringify(clients, null, 2));

/**
 * Returns a deep copy of client object (internal function)
 *
 * This prevents downstream use of retrieved objects
 * from making unintended changes to RAM database.
 * JSON parse errors to be trapped in parent function
 *
 * @param   {Object} client - Client object
 * @returns {Object} New deep copy client object
 */
const _deepCopyClient = (client) => {
  // Use stringify to maintain RAM database as immutable
  const copiedClient = JSON.parse(JSON.stringify(client));
  // convert to JS Date format
  copiedClient.updatedAt = new Date(Date(copiedClient.updatedAt));
  copiedClient.createdAt = new Date(Date(copiedClient.createdAt));
  return copiedClient;
};

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   id - The unique id of the client to find
 * @returns {Promise}  resolved promise with the client if found, otherwise undefined
 */
exports.find = (id) => {
  return new Promise((resolve) => {
    const foundClient = clients.find((client) => client.id === id);
    // Stringify a deep copy to maintain RAM database as immutable
    const safeClient = (foundClient) ? _deepCopyClient(foundClient) : undefined;
    resolve(safeClient);
  });
};

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String} clientId - The unique client id of the client to find
 * @returns {Promise} resolved promise with the client if found, otherwise undefined
 */
exports.findByClientId = (clientId) => {
  return new Promise((resolve) => {
    const foundClient = clients.find((client) => client.clientId === clientId);
    // Stringify a deep copy to maintain RAM database as immutable
    const safeClient = (foundClient) ? _deepCopyClient(foundClient) : undefined;
    resolve(safeClient);
  });
};

/**
 * Returns an array of client objects, otherwise returns empty array
 * @returns {Promise} resolved promise with the array if found, otherwise error
 */
exports.findAll = () => {
  return new Promise((resolve) => {
    const allClients = [];
    clients.forEach((client) => {
      // Stringify a deep copy to maintain RAM database as immutable
      allClients.push(_deepCopyClient(client));
    });
    resolve(allClients);
  });
};

/**
 * Save a new client record to the database
 * @param   {Object}  client - Object containing client properties
 * @returns {Promise} Resolved promise with the client if found, otherwise throws error
 */
exports.save = (client) => {
  return new Promise((resolve, reject) => {
    let err = false;
    // Check for pre-existing clients, error
    const foundClient = clients.find((cli) => cli.clientId === client.clientId);
    if (!(foundClient == null)) {
      err = new Error('clientname already exists');
      err.status = 400;
    }
    if (!err) {
      // Create new client and save to RAM database
      client.id = uuid.v4();
      client.createdAt = new Date();
      client.updatedAt = new Date();
      clients.push(client);

      // Stringify a deep copy to maintain RAM database as immutable
      const safeClient = _deepCopyClient(client);
      resolve(safeClient);
    } else {
      reject(err);
    }
  });
};

/**
 * Modify an existing client record
 * @param   {Object}   client - Object containing modified client properties
 * @returns {Promise}  resolved promise with the modified client, otherwise throws error
 */
exports.update = (client) => {
  return new Promise((resolve, reject) => {
    let err = false;
    const foundClient = clients.find((cli) => cli.id === client.id);
    if (foundClient == null) {
      err = new Error('client not found');
      err.status = 400;
    }
    if (!err) {
      // write changes to RAM database
      foundClient.name = client.name;
      foundClient.trustedClient = client.trustedClient;
      if ((client.clientSecret) && (client.clientSecret.length > 0)) {
        foundClient.clientSecret = client.clientSecret;
      }
      foundClient.allowedScope = client.allowedScope;
      foundClient.allowedRedirectURI = client.allowedRedirectURI;
      foundClient.clientDisabled = client.clientDisabled;
      foundClient.updatedAt = new Date();

      // Stringify a deep copy to maintain RAM database as immutable
      const safeClient = _deepCopyClient(foundClient);
      resolve(safeClient);
    } else {
      reject(err);
    }
  });
};

/**
 * Delete a client record
 * @param   {Object}   id - The id of the object to delete
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
    }
    if (!err) {
      // Modify RAM database, splice returns array
      const deletedClient = clients.splice(arrayIndex, 1);

      // Deep copy for consistancy with above functions
      const safeClient = _deepCopyClient(deletedClient[0]);
      resolve(safeClient);
    } else {
      reject(err);
    }
  });
};
