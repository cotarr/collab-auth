'use strict';

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
exports.find = (id) => {
  try {
    let user = users.find((user) => user.id === id);
    // make sure database remains immutable on emulated read
    if (user) user = JSON.parse(JSON.stringify(user));
    return Promise.resolve(user);
  } catch (err) {
    return Promise.resolve(undefined);
  }
};

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   username - The unique user name to find
 * @param   {Function} done     - The user if found, otherwise returns undefined
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */
exports.findByUsername = (username) => {
  try {
    let user = users.find((user) => user.username === username);
    // make sure database remains immutable on emulated read
    if (user) user = JSON.parse(JSON.stringify(user));
    return Promise.resolve(user);
  } catch (err) {
    return Promise.resolve(undefined);
  }
};

/**
 * Returns an array of all users
 * @returns {Promise} resolved array if found, otherwise resolves undefined
 */
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

/**
 * Updates the lastLogin column of user record to the current date/time
 * @returns {Promise} resolved to modified user, otherwise resolves undefined
 */
exports.updateLoginTime = (user) => {
  try {
    users.find((userObj) => userObj.id === user.id).lastLogin = new Date().toISOString();
  } catch (err) {
    console.log('error setting timestamp on user');
    console.log(err);
  }
  return user;
};
