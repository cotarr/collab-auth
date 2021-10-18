// ------------------------------------------------------------------------
// This is a JavaScript program to create a new administrator account
// for the PostgreSQL database.
//
// Run from root of repository folder using: npm run create-postgres-admin-user
//
// The program  will be prompted for:
//    User number (1000)
//    Username (admin)
//    Name (Admin Account)
//    Password
//
// The user account record will be saved to the database.
//
// This is not applicable when using the in-memory development database.
// ------------------------------------------------------------------------

'use strict';

const readline = require('readline');
const bcrypt = require('bcryptjs');

const config = require('../server/config');
const db = require('../server/db');

if (!config.database.enablePgUserDatabase) {
  console.log('Error: PostgreSQL database disabled, you are using in-memory database');
  process.exit(1);
}

function _isEOL (inChar) {
  if (inChar.charAt(0) === '\n') return true;
  if (inChar.charAt(0) === '\r') return true;
  return false;
}

function _removeCRLF (inStr) {
  // If tailing CR-LF, remove them
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length - 1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length - 1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }
  return inStr;
}

const nameAllowedChars =
  'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.-_@';
const idAllowedChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.-_@';

const _sanatizeString = function (inString, allowedChars) {
  let sanitizedString = '';
  if ((typeof inString === 'string') && (inString.length > 0)) {
    for (let i = 0; i < inString.length; i++) {
      const allowedCharIndex = allowedChars.indexOf(inString[i]);
      if (allowedCharIndex > -1) {
        sanitizedString += allowedChars[allowedCharIndex];
      }
    }
  }
  return sanitizedString;
};

const readKeyboardString = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const nextInputLine = (user, prompt) => {
  return new Promise((resolve) => {
    readKeyboardString.question(prompt, (input) => resolve({ user, input }));
  });
};

const promptNumberString = '\nUser number must be unique in database' +
  '\nMust be a positive integer value' +
  '\nSuggest 1000 for admin, and regular users 1, 2, 3, ...' +
  '\nEnter number (1000):';

const parseNumber = (dataObj) => {
  const user = dataObj.user;
  let numberString = dataObj.input;
  if (numberString.length === 0) numberString = '1000';
  let number;
  try {
    number = parseInt(numberString);
  } catch (err) {
    console.log('The number does not appear to be a positive integer');
    process.exit(1);
  }
  if (!Number.isInteger(number)) {
    console.log('The number does not appear to be a positive integer');
    process.exit(1);
  }
  if ((number < 1) || (number > 1000000000)) {
    console.log('The number does not appear to be a positive integer');
    process.exit(1);
  }
  user.number = number;
  return { user };
};

const promptUsernameString = '\nUsername allowed characters a-z A-Z 0-9 .-_@' +
  '\nUsername maximum length: ' + config.data.userUsernameMaxLength.toString() + ' characters' +
  '\nEnter new username (admin)';

const parseUsername = (dataObj) => {
  const user = dataObj.user;
  let username = dataObj.input;
  if (username.length === 0) username = 'admin';
  username = _sanatizeString(_removeCRLF(username), idAllowedChars);
  if (username.length > parseInt(config.data.userUsernameMaxLength)) {
    console.log('Error: Exceeded maximum username length');
    process.exit(1);
  }
  user.username = username;
  return { user };
};

const promptNameString = '\nName allowed characters a-z A-Z 0-9 .-_@ (space)' +
  '\nName maximum length: ' + config.data.userNameMaxLength.toString() + ' characters' +
  '\nEnter new Name (Admin User)';

const parseName = (dataObj) => {
  const user = dataObj.user;
  let name = dataObj.input;
  if (name.length === 0) name = 'Admin User';
  name = _sanatizeString(_removeCRLF(name), nameAllowedChars);
  if (name.length > parseInt(config.data.userNameMaxLength)) {
    console.log('Error: Exceeded maximum name length');
    process.exit(1);
  }
  user.name = name;
  return { user };
};

const promptPasswordString = '\nPassword required length: ' +
  config.data.userPasswordMinLength.toString() + ' to ' +
  config.data.userPasswordMaxLength.toString() + ' characters.' +
  '\nEnter new password: ';

const parsePassword = (dataObj) => {
  const user = dataObj.user;
  let password = dataObj.input;
  // Unicode characters can be up to 4 bytes, bcrypt has maximum input 72 characters.
  const uint8PasswordArray = new TextEncoder('utf8').encode(password);
  if (uint8PasswordArray.length > 72) {
    console.log('Error: Exceeded maximum encoded length length 72 bytes');
    process.exit(1);
  }
  if ((password.length < config.data.userPasswordMinLength) ||
    (password.length > config.data.userPasswordMaxLength)) {
    console.log('Error: Invalid password length');
    process.exit(1);
  }
  password = _removeCRLF(password);
  const hash = bcrypt.hashSync(password, 10);
  user.password = hash;
  return { user };
};

const dataObj = {};
dataObj.user = {
  loginDisabled: false,
  role: ['user.admin']
};

const addAdminUser = () => {
  console.log('\nThis is a program to create a new administrator user.');
  console.log('This will require a user number, username, name and new password.');
  console.log('Press Ctrl-C to abort');
  nextInputLine(dataObj.user, promptNumberString)
    .then((dataObj) => parseNumber(dataObj))
    .then((dataObj) => nextInputLine(dataObj.user, promptUsernameString))
    .then((dataObj) => parseUsername(dataObj))
    .then((dataObj) => nextInputLine(dataObj.user, promptNameString))
    .then((dataObj) => parseName(dataObj))
    .then((dataObj) => nextInputLine(dataObj.user, promptPasswordString))
    .then((dataObj) => parsePassword(dataObj))
    .then((dataObj) => { readKeyboardString.close(); return dataObj; })
    .then((dataObj) => db.users.save(dataObj.user))
    .then((newUser) => {
      if (newUser == null) {
        console.log('Error saving new user to database.');
      } else {
        console.log('Successfully saved:\n', JSON.stringify(newUser, null, 2));
      }
    })
    .catch((err) => console.log(err.message || err));
};
addAdminUser();
