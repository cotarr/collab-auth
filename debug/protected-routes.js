// protected-routes.js
//
// Confirm that protected routes are blocked
//
// ------------------------------------------------------------------------------
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');

// This is in local node_modules folder as dependency of express-session
const signature = require('cookie-signature');
const uid = require('uid-safe').sync;

if (!fs.existsSync('./package.json')) {
  console.log('Must be run from repository base folder as: node ./debug/protected-routes.js');
  process.exit(1);
}

const {
  testEnv,
  config
  // clients,
  // users
} = require('./modules/import-config.js');

const managedFetch = require('./modules/managed-fetch').managedFetch;
const {
  logRequest,
  showChain,
  showHardError
  // showJwtToken,
  // showJwtMetaData
} = require('./modules/test-utils');

if (config.database.disableWebAdminPanel) {
  console.log('Error: for this module to work properly, in the .env file, set:');
  console.log('    DATABASE_DISABLE_WEB_ADMIN_PANEL=false');
  console.log('or comment the line with a "#" character:');
  console.log('    #DATABASE_DISABLE_WEB_ADMIN_PANEL=true');
  process.exit(1);
}

const chainObj = Object.create(null);

const validateResponse = (chain, expectCode, expectLocation) => {
  const code = expectCode || 302;
  logRequest(chain, { ignoreErrorStatus: code });
  // console.log(chain.responseRawData);
  console.log('\tExpect: status === ' + code.toString());
  assert.strictEqual(chain.responseStatus, code);
  if (code === 302) {
    if (expectLocation == null) {
      console.log('\tExpect: Redirect URI matches /login');
      assert.strictEqual(chain.parsedLocationHeader, '/login');
    } else {
      console.log('\tExpect: Redirect URI matches ' + expectLocation);
      assert.strictEqual(chain.parsedLocationHeader, expectLocation);
    }
  }
  return Promise.resolve(chain);
};

/**
 * Initialize shared variables used in chain of promises
 * @param {Object} chain - Data variables passed from promise to promise.
 * @returns {Promise} resolving to chain object
 */
const setup = (chain) => {
  chain.requestAuthorization = 'cookie';
  chain.workingBasicAuthCredentials =
    Buffer.from(testEnv.clientId + ':' +
    testEnv.clientSecret).toString('base64');
  return Promise.resolve(chain);
};

//
// Main Promise Chain
//
// Calling setup() returns a Promise to initialize variables.
// The resolved promise .then is used to call the next function
// returning the next promise in a chain of asynchronous promises.
// Each promise performs a testing function. Testing related values
// are stored in a shared object "chain".
// The chain object is the argument of each function.
// The modified chain object is returned by the resolved promise.
//
setup(chainObj)

  // -------------------------------
  // 100 GET /login - Login form with csrf token
  // -------------------------------
  .then((chain) => {
    chain.testDescription =
      '100 GET /login - Login form with csrf token';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/login');
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  //
  // Assertion Tests...
  //
  .then((chain) => {
    logRequest(chain);
    // console.log(JSON.stringify(chain.responseRawData, null, 2));

    console.log('\tExpect: status === 200');
    assert.strictEqual(chain.responseStatus, 200);
    console.log('\tExpect: body contains "<title>collab-auth</title>"');
    assert.ok(chain.responseRawData.indexOf('<title>collab-auth</title>') >= 0);
    console.log('\tExpect: body contains "name="_csrf""');
    assert.ok(chain.responseRawData.indexOf('name="_csrf"') >= 0);
    if (chain.responseStatus === 200) {
      chain.parsedCsrfToken =
        chain.responseRawData.split('name="_csrf"')[1].split('value="')[1].split('">')[0];
      return Promise.resolve(chain);
    }
  })

  // -----------------------------------------------
  // 101 POST /login - Expect successful result
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription =
      '101 POST /login - Expect successful result';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/login');
    chain.requestAcceptType = 'text/html';
    chain.requestContentType = 'application/x-www-form-urlencoded';
    chain.requestBody = {
      username: testEnv.username,
      password: testEnv.password,
      _csrf: chain.parsedCsrfToken
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => {
    // console.log(JSON.stringify(chain.responseRawData, null, 2));
    console.log(chain.parsedLocationHeader);
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);
    console.log('\tExpect: Redirect URI matches /redirecterror');
    assert.strictEqual(chain.parsedLocationHeader, '/redirecterror');
    return Promise.resolve(chain);
  })

  // -------------------------
  // Create test cookies
  // -------------------------
  .then((chain) => {
    // Remember good Cookie
    chain.goodCookie = chain.currentSessionCookie;

    // Mint a new cookie with valid signature, random SID
    const alternateSid = uid(24);
    const signed = signature.sign(alternateSid, config.session.secret);
    const encoded = encodeURIComponent('s:' + signed);
    chain.badCookie = 'authorization.sid=' + encoded;
    return Promise.resolve(chain);
  })
  // -----------------------------------------------
  // 103 GET /secure (fail: cookie required)
  // In app.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '103 GET /secure (fail: cookie required)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/secure');
    chain.requestAcceptType = 'text/html';
    chain.currentSessionCookie = chain.badCookie;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  // -----------------------------------------------
  // 104 GET /secure (Confirm successful request with cookie)
  // In app.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '104 GET /secure (Confirm successful request with cookie)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/secure');
    chain.requestAcceptType = 'text/html';
    chain.currentSessionCookie = chain.goodCookie;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 200))

  // -----------------------------------------------
  // 200 GET /changepassword (fail: cookie required)
  // In site.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '200 GET /changepassword (cookie required)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/changepassword');
    chain.currentSessionCookie = chain.badCookie;
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 201 POST /changepassword (Fail: cookie required)
  // In site.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '201 POST /changepassword (Fail: cookie required)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/changepassword');
    chain.currentSessionCookie = chain.badCookie;
    chain.requestAcceptType = 'text/html';
    chain.requestContentType = 'application/x-www-form-urlencoded';
    chain.requestBody = {
      username: testEnv.username,
      oldpassword: 'abcdefghij',
      newpassword1: 'abcdefghij',
      newpassword2: 'abcdefghij',
      _csrf: 'xxxxxxxxxxxx'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  // -----------------------------------------------
  // 202 GET /redirecterror (fail: cookie required)
  // In site.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '202 GET /redirecterror (fail: cookie required)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/redirecterror');
    chain.currentSessionCookie = chain.badCookie;
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  // -----------------------------------------------
  // 203 GET /noscope (fail: cookie required)
  // In site.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '203 GET /noscope (fail: cookie required)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/noscope');
    chain.currentSessionCookie = chain.badCookie;
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  // -----------------------------------------------
  // 300 GET /dialog/authorize (fail: cookie required)
  // in oauth2.js
  // Good cookie returns 400
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '300 GET /dialog/authorize (fail: cookie required)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/dialog/authorize');
    chain.currentSessionCookie = chain.badCookie;
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 301 POST /dialog/authorize/decision (fail: cookie required)
  // in oauth2.js
  // Good cookie returns 403
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '301 POST /dialog/authorize/decision (fail: cookie required)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/dialog/authorize/decision');
    chain.currentSessionCookie = chain.badCookie;
    chain.requestAcceptType = 'text/html';
    chain.requestContentType = 'application/x-www-form-urlencoded';
    chain.requestBody = {
      transaction_id: 'xxxxxxxxxxx',
      _csrf: 'xxxxxxxxxxx'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  // -----------------------------------------------
  // 302 GET /oauth/token (fail: basic auth)
  // In oauth2.js
  // Valid basic auth return 200 (new token)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription =
      '302 GET /oauth/token (fail: basic auth)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/oauth/token');
    chain.requestAuthorization = 'basic';
    chain.requestBasicAuthCredentials =
      Buffer.from('xxxx1234' + ':' +
      'abcdefghijklmnop').toString('base64');
    // chain.requestBasicAuthCredentials = chain.workingBasicAuthCredentials;
    chain.requestAcceptType = 'application/json';
    chain.requestContentType = 'application/json';
    chain.requestBody = {
      grant_type: 'client_credentials',
      scope: 'api.read api.write'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  // -----------------------------------------------
  // 303 POST /oauth/introspect (fail: basic auth)
  // In oauth2.js
  // Valid basic auth return 400 (Input validation error)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '303 POST /oauth/introspect (fail: basic auth)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/oauth/introspect');
    chain.requestAuthorization = 'basic';
    chain.requestBasicAuthCredentials =
      Buffer.from('xxxx1234' + ':' +
      'abcdefghijklmnop').toString('base64');
    // chain.requestBasicAuthCredentials = chain.workingBasicAuthCredentials;
    chain.requestAcceptType = 'application/json';
    chain.requestContentType = 'application/json';
    chain.requestBody = {
      access_token: 'xxxxxxxxxxxxx'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  //
  // Reset after basic auth
  //
  .then((chain) => {
    chain.requestAuthorization = 'cookie';
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 304 POST /oauth/token/revoke (fail: basic auth)
  // In oauth2.js
  // Valid basic auth return 400 (Input validation error)
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '304 POST /oauth/token/revoke (fail: basic auth)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/oauth/token/revoke');
    chain.requestAuthorization = 'basic';
    chain.requestBasicAuthCredentials =
      Buffer.from('xxxx1234' + ':' +
      'abcdefghijklmnop').toString('base64');
    // chain.requestBasicAuthCredentials = chain.workingBasicAuthCredentials;
    chain.requestAcceptType = 'application/json';
    chain.requestContentType = 'application/json';
    chain.requestBody = {
      access_token: 'xxxxxxxxxxxxx'
    };
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 401))

  //
  // Reset after basic auth
  //
  .then((chain) => {
    chain.requestAuthorization = 'cookie';
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })

  // -----------------------------------------------
  // 400 GET /panel/menu (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '400 GET /panel/menu (fail: cookie required)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/menu');
    chain.currentSessionCookie = chain.badCookie;
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 401 GET /panel/listusers (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '401 GET /panel/listusers (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/listusers');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 402 GET /panel/viewuser (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '401 GET /panel/viewuser (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/viewuser');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 403 GET /panel/createuser (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '403 GET /panel/createuser (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/createuser');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 404 GET /panel/edituser (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '404 GET /panel/edituser (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/edituser');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 405 GET /panel/deleteuser (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '405 GET /panel/deleteuser (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/deleteuser');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 406 GET /panel/listclients (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '406 GET /panel/listclients (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/listclients');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 407 GET /panel/viewclient (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '407 GET /panel/viewclient (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/viewclient');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 408 GET /panel/createclient (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '408 GET /panel/createclient (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/createclient');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 409 GET /panel/editclient (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '409 GET /panel/editclient (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/editclient');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 410 GET /panel/deleteclient (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '410 GET /panel/deleteclient (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/deleteclient');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 411 GET /panel/removealltokens (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '411 GET /panel/removealltokens (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/removealltokens');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 412 GET /panel/stats (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 200
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '412 GET /panel/stats (fail: cookie required)';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/stats');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain))

  // -----------------------------------------------
  // 500 POST /panel/createuser (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '500 POST /panel/createuser (fail: cookie required)';
    chain.requestMethod = 'POST';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/createuser');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 501 POST /panel/editeuser (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '501 POST /panel/editeuser (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/edituser');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 502 POST /panel/deleteeuser (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '502 POST /panel/deleteeuser (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/deleteuser');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 503 POST /panel/createclient (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '503 POST /panel/createclient (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/createclient');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 504 POST /panel/editeclient (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '504 POST /panel/editeclient (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/editclient');
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 505 POST /panel/deleteeclient (fail: cookie required)
  // In admin-panel.js
  // Good cookie returns 422
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '505 POST /panel/deleteeclient (fail: cookie required)';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/panel/deleteclient');
    // chain.currentSessionCookie = chain.goodCookie;
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 302, '/panel/unauthorized'))

  // -----------------------------------------------
  // 999 POST /login - End of test, check for positive end test
  // -----------------------------------------------
  .then((chain) => {
    chain.testDescription = '999 POST /login - End of test, check for positive end test';
    chain.requestMethod = 'GET';
    chain.requestFetchURL = encodeURI(testEnv.authURL + '/changepassword');
    chain.currentSessionCookie = chain.goodCookie;
    chain.requestAcceptType = 'text/html';
    return Promise.resolve(chain);
  })
  .then((chain) => managedFetch(chain))
  .then((chain) => validateResponse(chain, 200))
  //
  // For Debug, show chain object
  //
  .then((chain) => showChain(chain))

  //
  // Assert did not exit, assume all tests passed
  //
  .then((chain) => {
    console.log('---------------------');
    console.log('  All Tests Passed');
    console.log('---------------------');
  })

  //
  // In normal testing, no errors should be rejected in the promise chain.
  // In the case of hardware network errors, catch the error.
  .catch((err) => showHardError(err));
