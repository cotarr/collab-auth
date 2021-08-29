'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const fs = require('fs');

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
 *
 * Optionally you can set these properties which are
 *
 * trustedClient: default if missing is false. If this is set to true then the client is regarded
 * as a trusted client and not a 3rd party application. That means that the user will not be
 * presented with a decision dialog with the trusted application and that the trusted application
 * gets full scope access without the user having to make a decision to allow or disallow the scope
 * access.
 */

let clients = [];

// clients = [
//   {
//     id: '5515a9c6-6354-4331-84dc-af8595fbbebf',
//     name: 'collab-frontend',
//     clientId: 'abc123',
//     clientSecret: 'ssh-secret',
//     trustedClient: false,
//     allowedScope: [
//       'offline_access',
//       'auth.none',
//       'auth.token',
//       'api.read',
//       'api.write',
//       'api.admin'
//     ],
//     defaultScope: [
//       'auth.none'
//     ],
//     allowedRedirectURI: [
//       'http://127.0.0.1:3000/login/callback',
//       'http://localhost:3003/login/callback'
//     ]
//   }
// ];

try {
  clients = JSON.parse(fs.readFileSync('./clients-db.json', 'utf8'));
} catch (e) {
  console.log(e.message);
  process.exit(1);
}
// console.log(JSON.stringify(clients, null, 2));

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   id   - The unique id of the client to find
 * @returns {Promise}  resolved promise with the client if found, otherwise undefined
 */

// TODO rewrite for console.log
// exports.find = (id) =>
//   Promise.resolve(clients.find((client) => client.id === id));
exports.find = (id) => {
  if (debuglog) {
    console.log('db.clients.find (entry)');
    // console.log('    find(id) ' +
    //   JSON.stringify(clients.find((client) => client.id === id), null, 2));
    console.log('db.clients.find (finished)');
  }
  return Promise.resolve(clients.find((client) => client.id === id));
};

/**
 * Returns a client if it finds one, otherwise returns null if a client is not found.
 * @param   {String}   clientId - The unique client id of the client to find
 * @param   {Function} done     - The client if found, otherwise returns undefined
 * @returns {Promise} resolved promise with the client if found, otherwise undefined
 */

// TODO rewrite for console.log
// exports.findByClientId = (clientId) =>
//   Promise.resolve(clients.find((client) => client.clientId === clientId));
exports.findByClientId = (clientId) => {
  if (debuglog) console.log('db.users.findByUsername (called)');
  return Promise.resolve(clients.find((client) => client.clientId === clientId));
};

exports.findAll = () => {
  return new Promise((resolve, reject) => {
    const error = false;
    if (!error) {
      resolve(clients);
    } else {
      reject(error);
    }
  });
};

if (debuglog) {
  exports.debug = () => {
    console.log('clients\n' + JSON.stringify(clients, null, 2));
  };
}
