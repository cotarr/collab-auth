// ----------------------
// Custom log utilities
// ----------------------

'use strict';

const path = require('path');
const fs = require('fs');

const authLogFilename = path.join(__dirname, '../logs/auth.log');

const nodeEnv = process.env.NODE_ENV || 'development';

const config = require('./config');

let logToFile = (nodeEnv === 'production');
// enable console logging in production by export NODE_DEBUG_LOG=1
if (config.nodeDebugLog) {
  logToFile = false;
}

if (logToFile) {
  console.log('Auth activity Log: ' + authLogFilename);
} else {
  console.log('Auth activity Log: (Console)');
}

//
// Authorization log file (Option: setup to fail2ban to block IP addresses)
//
const _addMessageWithAddress = (req, message) => {
  const now = new Date();
  let logEntry = now.toISOString();
  if ('_remoteAddress' in req) {
    logEntry += ' ' + req._remoteAddress;
  } else {
    logEntry += ' NOADDRESS';
  }
  logEntry += ' ' + message;

  if (logToFile) {
    fs.writeFile(
      authLogFilename,
      logEntry + '\n',
      {
        encoding: 'utf8',
        mode: 0o644,
        flag: 'a'
      },
      function (err) {
        if (err) {
          console.error('Error writing auth.log');
        }
      }
    );
  } else {
    console.log(logEntry);
  }
};

const logPassportLocalLogin = function (req, user) {
  return new Promise((resolve) => {
    const message = 'Successful login: ' + user.username;
    _addMessageWithAddress(req, message);
    // pass user through unchanged
    resolve(user);
  });
};

const logPassportLocalError = function (req, err) {
  const message = 'Login failure: ' + err.message;
  _addMessageWithAddress(req, message);
};

const adminLogActivity = function (req, message) {
  _addMessageWithAddress(req, 'Admin activity: ' + message);
};

const userLogActivity = function (req, message) {
  _addMessageWithAddress(req, 'User activity: ' + message);
};

module.exports = {
  logPassportLocalLogin,
  logPassportLocalError,
  adminLogActivity,
  userLogActivity
};
