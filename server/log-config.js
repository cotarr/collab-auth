//
// This module sets configuration options to be used
// by the morgan http log module.
//
// it returns an object
// {
//   format: (string)
//   options: (object)
// }
// -----------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');

const config = require('./config');
const nodeEnv = process.env.NODE_ENV || 'development';

let logToFile = (nodeEnv === 'production');
let errorFilter = (nodeEnv === 'production');

// enable console logging in production by export NODE_DEBUG_LOG=1
if (config.nodeDebugLog) {
  logToFile = false;
  errorFilter = false;
}
// disable
errorFilter = false;

const logFolder = path.join(__dirname, '../logs');
const logFilename = logFolder + '/access.log';

//
// If the log/ folder does not exist, then create it
//
if (logToFile) {
  console.log('logFolder ' + logFolder);
  try {
    if (!fs.existsSync(logFolder)) {
      console.log('Log folder not found, creating folder...');
      fs.mkdirSync(logFolder);
      fs.chmodSync(logFolder, 0o700);
    }
  } catch (err) {
    console.log('Unable to create log folder');
    console.error(err);
    process.exit(1);
  }
}

const logConfig = {};

logConfig.format = ':date[iso] :remote-addr :status :method :http-version :req[host]:url';
logConfig.options = {};

// for start up message
let logStream = '(console)';

if (logToFile) {
  // for start up message
  logStream = logFilename;
  // Function to write log entries to file as option property
  logConfig.options.stream = fs.createWriteStream(logFilename, {
    encoding: 'utf8',
    mode: 0o644,
    flags: 'a'
  });
}; // nodeEnv === production

//
// Filter function: If enabled, log only requrests with error status codes
//
if (errorFilter) {
  // for start up message
  logStream += ' (Errors Only)';
  // Function to filter log entries as option property
  logConfig.options.skip = (req, res) => {
    return ((res.statusCode < 400) || (res.statusCode === 404));
  };
} // if (errorFilter)

// This shows at server start up to console out
console.log('HTTP Access Log: ' + logStream);

module.exports = logConfig;
