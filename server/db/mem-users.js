'use strict';

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

const fs = require('fs');
const uuid = require('uuid');

let users = [];

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
    // make sure database remains immutable on database emulated read
    if (user) {
      user = JSON.parse(JSON.stringify(user));
      if (user.lastLogin) user.lastLogin = new Date(Date(user.lastLogin));
      user.updatedAt = new Date(Date(user.updatedAt));
      user.createdAt = new Date(Date(user.createdAt));
    }
    return Promise.resolve(user);
  } catch (err) {
    return Promise.resolve(undefined);
  }
};

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   username - The unique user name to find
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */
exports.findByUsername = (username) => {
  try {
    let user = users.find((user) => user.username === username);
    // make sure database remains immutable on emulated read
    if (user) {
      user = JSON.parse(JSON.stringify(user));
      if (user.lastLogin) user.lastLogin = new Date(user.lastLogin);
      user.updatedAt = new Date(user.updatedAt);
      user.createdAt = new Date(user.createdAt);
    }
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
      // Keep memory database immutable
      const users2 = JSON.parse(JSON.stringify(users));
      users2.forEach((user) => {
        if (user.lastLogin) user.lastLogin = new Date(user.lastLogin);
        user.updatedAt = new Date(user.updatedAt);
        user.createdAt = new Date(user.createdAt);
      });
      resolve(users2);
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
  return new Promise((resolve, reject) => {
    try {
      const edited = users.find((userObj) => userObj.id === user.id);
      edited.lastLogin = new Date().toISOString();
      resolve(edited);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Save a new user record to the database
 * @param   {Object}   user Object containing user properties
 * @returns {Promise}  resolved promise with the user if found, otherwise throws error
 */
exports.save = (user) => {
  return new Promise((resolve, reject) => {
    let err = false;
    const foundUser = users.find((cli) => cli.username === user.username);
    if (!(foundUser == null)) {
      err = new Error('username already exists');
      err.status = 400;
      throw err;
    }
    if (!err) {
      user.id = uuid.v4();
      user.lastLogin = null;
      user.createdAt = new Date();
      user.updatedAt = new Date();
      users.push(user);
      resolve(user);
    } else {
      reject(err);
    }
  });
};

/**
 * Modify an existing user record
 * @param   {Object}   user Object containing modified user properties
 * @returns {Promise}  resolved promise with the modified user, otherwise throws error
 */
exports.update = (user) => {
  return new Promise((resolve, reject) => {
    let err = false;
    const foundUser = users.find((cli) => cli.id === user.id);
    if (foundUser == null) {
      err = new Error('user not found');
      err.status = 400;
      throw err;
    }
    if (!err) {
      foundUser.name = user.name;
      foundUser.password = user.userSecret;
      foundUser.loginDisabled = user.loginDisabled;
      foundUser.role = user.role;
      if ((user.password) && (user.password.length > 0)) {
        foundUser.password = user.password;
      }
      foundUser.updatedAt = new Date();
      resolve(foundUser);
    } else {
      reject(err);
    }
  });
};

/**
 * Delete a user record
 * @param   {Object}   id The id of the object to delete
 * @returns {Promise}  resolved promise with celeted user object, otherwise throws error
 */
exports.delete = (id) => {
  return new Promise((resolve, reject) => {
    let err = false;
    let arrayIndex = -1;
    if (users.length > 0) {
      for (let i = 0; i < users.length; i++) {
        if (users[i].id === id) arrayIndex = i;
      }
    }
    if (arrayIndex === -1) {
      err = new Error('user not found');
      err.status = 400;
      throw err;
    }
    if (!err) {
      resolve(users.splice(arrayIndex, 1));
    } else {
      reject(err);
    }
  });
};
