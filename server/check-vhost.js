'use strict';
//
// checks the hostname in HTTP request matched defined vhost domain name.
//
// Mis-matched returns 404 Not Found
// ------------------------------------------------

const http = require('http');

const config = require('./config/');
// const nodeEnv = process.env.NODE_ENV || 'development';

//
// To disable, set vhost = "*"
//

let vhost = config.site.vhost.toLowerCase();

if (vhost === '*') vhost = null;
if (vhost) {
  console.log('Vhost: ' + vhost);
}
/**
 * Express middleware to accept HTTP request by passing to next()
 * when the HTTP request domain name matchs configuration value
 * otherise return 404 not found.
 */
const rejectNotVhost = function (req, res, next) {
  if (vhost) {
    if ((req.hostname) && (typeof req.hostname === 'string') &&
      ((req.hostname.toLowerCase() === vhost) ||
      (req.hostname.toLowerCase() === 'www.' + vhost))) {
      next();
    } else {
      const code = 404;
      const message = http.STATUS_CODES[404];
      res.status(code).send(message);
    }
  } else {
    // disabled, vhost='', accept as valid hostname
    next();
  }
};

/**
 * isVhostMatch returns true if HTTP request domain name
 * matches configuration file, else return false.
 * @param   {Object} req - Express request object
 * @returns {boolean}
 */
const isVhostMatch = function (req) {
  if (vhost) {
    if ((req.hostname) && (typeof req.hostname === 'string') &&
      ((req.hostname.toLowerCase() === vhost) ||
      (req.hostname.toLowerCase() === 'www.' + vhost))) {
      return true;
    } else {
      return false;
    }
  } else {
    // disabled, vhost='', accept as valid hostname
    return true;
  }
};

/**
 * notVhostMatch returns false if HTTP request domain name
 * matches configuration file, else return true for mis-match.
 * @param   {Object} req - Express request object
 * @returns {boolean}
 */
const notVhostMatch = function (req) {
  if (vhost) {
    // negate result
    if ((req.hostname) && (typeof req.hostname === 'string') &&
      ((req.hostname.toLowerCase() === vhost) ||
      (req.hostname.toLowerCase() === 'www.' + vhost))) {
      // inverted
      return false;
    } else {
      // inverted
      return true;
    }
  } else {
    // disabled, vhost='', accept as valid hostname
    return true;
  }
};

module.exports = {
  rejectNotVhost: rejectNotVhost,
  isVhostMatch: isVhostMatch,
  notVhostMatch: notVhostMatch
};
