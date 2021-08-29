'use strict';

// conditional debug console.log statements
const debuglog = global.debuglog || false;

const fs = require('fs');

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

let users = [];

// users = [
//   {
//     id: '43d8e6a4-418d-4272-9453-baf8e0a13ca1',
//     username: 'bob',
//     password: 'secret',
//     name: 'Bob Smith',
//     role: [
//       'offline_access',
//       'auth.token',
//       'api.read'
//     ]
//   }
// ];

try {
  users = JSON.parse(fs.readFileSync('./users-db.json', 'utf8'));
} catch (e) {
  console.log(e.message);
  process.exit(1);
}
// console.log(JSON.stringify(users, null, 2));

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   id - The unique id of the user to find
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */

// TODO rewrite for console.log
// exports.find = (id) =>
//   Promise.resolve(users.find((user) => user.id === id));
exports.find = (id) => {
  if (debuglog) {
    console.log('db.users.find (entry)');
    // console.log('    find(id): ', JSON.stringify(users.find((user) => user.id === id), null, 2));
    console.log('db.users.find (finished)');
  }
  return Promise.resolve(users.find((user) => user.id === id));
};

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   username - The unique user name to find
 * @param   {Function} done     - The user if found, otherwise returns undefined
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */

// TODO rewrite for console.log
// exports.findByUsername = (username) =>
//   Promise.resolve(users.find((user) => user.username === username));
exports.findByUsername = (username) => {
  if (debuglog) console.log('db.users.findByUsername (called)');
  // if (debuglog) console.log('    find(user) ', users.find((user) => user.username === username));
  return Promise.resolve(users.find((user) => user.username === username));
};

exports.findAll = () => {
  return new Promise((resolve, reject) => {
    const error = false;
    if (!error) {
      resolve(users);
    } else {
      reject(error);
    }
  });
};

exports.updateLoginTime = (user) => {
  try {
    users.find((userObj) => userObj.id === user.id).lastLogin = new Date().toISOString();
  } catch (err) {
    console.log('error setting timestamp on user');
    console.log(err);
  }
  return user;
};

if (debuglog) {
  exports.debug = () => {
    console.log('users\n' + JSON.stringify(users, null, 2));
  };
}
