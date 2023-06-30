// ----------------------
// Custom log utilities
// ----------------------

'use strict';

const path = require('path');
const fs = require('fs');

const authLogFilename = path.join(__dirname, '../logs/auth.log');

const nodeEnv = process.env.NODE_ENV || 'development';

// const config = require('./config');
const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

let logToFile = (nodeEnv === 'production');
// enable console logging in production by export NODE_DEBUG_LOG=1
if (nodeDebugLog) {
  logToFile = false;
}

if (logToFile) {
  console.log('Auth activity Log: ' + authLogFilename);
} else {
  console.log('Auth activity Log: (Console)');
}

/**
 * Write string to authorization log file: logs/auth.log
 * @param {Object} req - Express request object
 * @param {string} message - Message to write to log file
 */
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
        mode: 0o600,
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

/**
 * Function to handle user login entry to log file
 * @param {*} req - Express request object
 * @param {*} user - Object containing user properties
 * @returns {Promise} Resolves to user object (unmodified)
 */
const logPassportLocalLogin = function (req, user) {
  return new Promise((resolve) => {
    const message = 'Successful login: ' + user.username;
    _addMessageWithAddress(req, message);
    // pass user through unchanged
    resolve(user);
  });
};

/**
 * Function to handle errors entry to log file
 * @param {Object} req - Express request object
 * @param {Error} err - Error object
 */
const logPassportLocalError = function (req, err) {
  const message = 'Login failure: ' + err.message;
  _addMessageWithAddress(req, message);
};

/**
 * Function to handle admin activity entry to log file
 * @param {Object} req - Express request object
 * @param {string} message - Message to log
 */
const adminLogActivity = function (req, message) {
  _addMessageWithAddress(req, 'Admin activity: ' + message);
};

/**
 * Function to handle user activity entry to log file
 * @param {Object} req - Express request object
 * @param {string} message - Message to log
 */
const userLogActivity = function (req, message) {
  _addMessageWithAddress(req, 'User activity: ' + message);
};

module.exports = {
  logPassportLocalLogin,
  logPassportLocalError,
  adminLogActivity,
  userLogActivity
};
