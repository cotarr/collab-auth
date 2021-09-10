'use strict';

/**
 * This is the configuration of the users that are allowed to connected to your authorization
 * server. These represent users of different client applications that can connect to the
 * authorization server. At a minimum you need the required properties of
 *
 * id:            A unique numeric id of your user
 * username:      The user name of the user
 * password:       The password of your user
 * name:          The name of your user
 * loginDisabled: If exists and set to true, prevents password authentication for user.
 * role:          Array of scope strings allowed to user permissions
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
 * Returns a deep copy of user object (internal function)
 *
 * This prevents downstream use of retrieved objects
 * from making unintended changes to RAM database.
 * JSON parse errors to be trapped in parent function
 *
 * @param   {Object} user User object
 * @returns {Object} New deep copy user object
 */
const _deepCopyUser = (user) => {
  // Use stringify to maintain RAM database as immutable
  const copiedUser = JSON.parse(JSON.stringify(user));
  // convert to JS Date format
  if (copiedUser.lastLogin) copiedUser.lastLogin = new Date(Date(copiedUser.lastLogin));
  copiedUser.updatedAt = new Date(Date(copiedUser.updatedAt));
  copiedUser.createdAt = new Date(Date(copiedUser.createdAt));
  return copiedUser;
};

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   id - The unique id of the user to find
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */
exports.find = (id) => {
  return new Promise((resolve) => {
    const foundUser = users.find((user) => user.id === id);
    // Stringify a deep copy to maintain RAM database as immutable
    const safeUser = (foundUser) ? _deepCopyUser(foundUser) : undefined;
    resolve(safeUser);
  });
};

/**
 * Returns a user if it finds one, otherwise returns null if a user is not found.
 * @param   {String}   username - The unique user name to find
 * @returns {Promise} resolved user if found, otherwise resolves undefined
 */
exports.findByUsername = (username) => {
  return new Promise((resolve) => {
    const foundUser = users.find((user) => user.username === username);
    // Stringify a deep copy to maintain RAM database as immutable
    const safeUser = (foundUser) ? _deepCopyUser(foundUser) : undefined;
    resolve(safeUser);
  });
};

/**
 * Returns an array of all users
 * @returns {Promise} resolved array if found, otherwise resolves undefined
 */
exports.findAll = () => {
  return new Promise((resolve) => {
    const allUsers = [];
    users.forEach((user) => {
      // Stringify a deep copy to maintain RAM database as immutable
      allUsers.push(_deepCopyUser(user));
    });
    resolve(allUsers);
  });
};

/**
 * Updates the lastLogin column of user record to the current date/time
 * @returns {Promise} resolved to modified user, otherwise resolves undefined
 */
exports.updateLoginTime = (user) => {
  return new Promise((resolve) => {
    const foundUser = users.find((userObj) => userObj.id === user.id);
    if (foundUser) {
      // This modifies RAM database
      foundUser.lastLogin = new Date().toISOString();
    }
    // Stringify a deep copy to maintain RAM database as immutable
    const safeUser = (foundUser) ? _deepCopyUser(foundUser) : undefined;
    resolve(safeUser);
  });
};

/**
 * Save a new user record to the database
 * @param   {Object}   user Object containing new created user properties
 * @returns {Promise}  resolved promise created use, otherwise user exist throws error
 */
exports.save = (user) => {
  return new Promise((resolve, reject) => {
    let err = false;
    // Check for pre-existing users, error
    const foundUser = users.find((usr) => usr.username === user.username);
    if (!(foundUser == null)) {
      err = new Error('username already exists');
      err.status = 400;
    }
    if (!err) {
      // Create new user and save to RAM database
      user.id = uuid.v4();
      user.lastLogin = null;
      user.createdAt = new Date();
      user.updatedAt = new Date();
      users.push(user);

      // Stringify a deep copy to maintain RAM database as immutable
      const safeUser = _deepCopyUser(user);
      resolve(safeUser);
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
    const foundUser = users.find((usr) => usr.id === user.id);
    if (foundUser == null) {
      err = new Error('user not found');
      err.status = 400;
    }
    if (!err) {
      // write changes to RAM database
      foundUser.name = user.name;
      foundUser.password = user.userSecret;
      foundUser.loginDisabled = user.loginDisabled;
      foundUser.role = user.role;
      if ((user.password) && (user.password.length > 0)) {
        foundUser.password = user.password;
      }
      foundUser.updatedAt = new Date();

      // Stringify a deep copy to maintain RAM database as immutable
      const safeUser = _deepCopyUser(foundUser);
      resolve(safeUser);
    } else {
      reject(err);
    }
  });
};

/**
 * Modify password for existing user by user id
 * @param   {String}  id String containing UUID for record
 * @param   {String}  password String containing new password entry
 * @returns {Promise} resolved promise with the modified user, otherwise throws error
 */
exports.updatePassword = (id, password) => {
  return new Promise((resolve, reject) => {
    let err = false;
    const foundUser = users.find((usr) => usr.id === id);
    if (foundUser == null) {
      err = new Error('user not found');
      err.status = 400;
    }
    if (!err) {
      // write changes to RAM database
      foundUser.password = password;
      foundUser.updatedAt = new Date();

      // Stringify a deep copy to maintain RAM database as immutable
      const safeUser = _deepCopyUser(foundUser);
      resolve(safeUser);
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
    }
    if (!err) {
      // Modify RAM database, splice returns array
      const deletedUser = users.splice(arrayIndex, 1);

      // Deep copy for consistancy with above functions
      const safeUser = _deepCopyUser(deletedUser[0]);
      resolve(safeUser);
    } else {
      reject(err);
    }
  });
};
