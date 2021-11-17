//
// Module containing miscellaneous counters for display on stats page
// ---------------------------------------------------------------------
'use strict';

if (!global.counter) {
  global.counter = {
    userLogin: 0,
    failedLogin: 0,
    clientToken: 0,
    userToken: 0,
    refreshToken: 0,
    introspect: 0,
    httpRequest: 0
  };
}
global.startDate = new Date();

/**
 * Function to increment a counter variable for use on the statistics page
 * @param   {String} - key This is the string value of the key name
 */
exports.incrementCounterFn = (key) => {
  if ((global) && (global.counter) && (key in global.counter)) {
    global.counter[key]++;
  }
};

/**
 * Function to return promise to increment a counter variable for use on the statistics page
 * One parameter is passed through unaltered to allow promise chain to flow.
 * @param   {Object} - passThruData - Unspecified data object to pass through promise.
 * @param   {String} - key This is the string value of the key name to increment
 * @returns {Object} passThruData (no changes to passThruData)
 */
exports.incrementCounterPm = (passThruData, key) => {
  if ((global) && (global.counter) && (key in global.counter)) {
    global.counter[key]++;
  }
  return Promise.resolve(passThruData);
};

/**
 * Get server start time as an ISO string
 * @returns   {String} - Server start time
 */
exports.serverStartIsoString = () => {
  return global.startDate.toISOString();
};

/**
 * Convert counter integers to string and place in object
 * @returns   {Object} - Object with strings for each counter
 */
exports.counterToStringObj = () => {
  const counterObj = {};
  for (const key in global.counter) {
    counterObj[key] = global.counter[key].toString();
  };
  return counterObj;
};
