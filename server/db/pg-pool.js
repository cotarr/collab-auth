'use strict';
const pg = require('pg');

// const config = require('../config');
// const nodeEnv = process.env.NODE_ENV || 'development';

// Create table: node_modules/connect-pg-simple/table.sql
//
// Env Variables
//
// PGUSER
// PGPASSWORD
// PGHOST or PGHOSTADDR
// PGPORT
// PGDATABASE
// PGSSLMODE=disable
//

module.exports = new pg.Pool({
  max: 20, // set pool max size to 20
  // close idle clients after 1 second
  idleTimeoutMillis: 1000,
  // return an error after 1 second if connection could not be established
  connectionTimeoutMillis: 1000,
  // close (and replace) a connection after it has been used 7500 times
  maxUses: 7500
});
