// ----------------------------------------------
// Robot exclusion policy
// ----------------------------------------------
//
// In app.js:
//     const robotPolicy = require('../util/robot-policy');
//     // Route for robot policy
//     app.get('/robots.txt', robotPolicy);
// ----------------------------------------------
'use strict';

/**
 * Route handler for /robots.txt
 */
module.exports = (req, res) => {
  res.set('Content-Type', 'text/plain').send(
    'User-agent: *\n' +
    'Disallow: /\n');
};
