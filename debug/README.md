# JavaScript Debug Tests

## Rant

First a rant...

For open source developers who donate their time and 
offer software for free, it is frustrating to use an 
API testing client like Postman for many years, 
then one day the free tier scratchpad is discontinued.

Then more frustrating to re-write the tests for VSCode ThunderClient,
first to find a new limit on request per collection,
split the requests to more collections, only for find ThunderClient
disabled itself by reaching a monthly limit.

Motivated by frustration, these adhoc debug tests were written
in native javascript.

## List of scripts

- debug/code-grant.js

This code-grant is probably the main purpose of the project.
It is the most complex OAuth 2.0 workflow, and difficult to 
understand. This is a request by request step through 
of authorization handshakes using authorization code grant.
This script incorporates use of refresh_tokens that are used 
to replaced expired access_tokens.

- debug/client-grant.js

Client grant is the simplest Oauth 2.0 workflow because a single
POST request will exchange client credentials for an access token.

- debug/access-token.js

This script was written to explore the differences between
the contents of the access_token payload and the associated 
token meta-data that is stored in the authorization server database.

- debug/cookie.js

This script is more a a deep dive into learning how cookies
work in general using express-session and passport as 
authorization middleware.

- debug/login-form-submission-js

This script will emulate the browser submission of the
HTML form for user password entry.

- debug/redirect-timing-debug.js

This is a debug script used to detect PostgreSQL database
write latency time causing session records to be overwritten.

- debug/public-routes.js

Confirm that public routes are accessible

- debug/protected-routes.js

Confirm that protected routes are blocked

- debug/load-test-introspect.js

Evaluate how many requests per second the
GET /oauth/introspect API can handle.

```bash
# Number of requests to send during testing (default 10)
TESTENV_LT_COUNT=10
# If 0, send requests at maximum rate
# if > 0, limit rate, value of milliseconds/request (default 0)
TESTENV_LT_PERIODMS=0
```
- debug/rate-limit.js

Confirm that express-rate-limit is working.

rate-limit.js requires:

```bash
LIMITS_PASSWORD_RATE_LIMIT_COUNT=4
LIMITS_TOKEN_RATE_LIMIT_COUNT=6
LIMITS_WEB_RATE_LIMIT_COUNT=16
```

## Command Line Test Execution

Tests must be executed from the base folder of 
the repository by including the "test" folder
in the filename.

```bash
node ./debug/access-token.js
node ./debug/client-grant.js
node ./debug/code-grant.js
node ./debug/cookie.js
node ./debug/login-form-submission.js
node ./debug/redirect-timing-debug.js
node ./debug/public-routes.js
node ./debug/protected-routes.js
```

## Compatibility with server configuration options

The test scripts will incorporate expected values that are
derived from the authorization server configuration files,
client account database and user account database.

The test scripts contain conditional elements where various tests 
may be skipped, or expected values may be configuration dependant.
The following different authorization server configuration options
are supported and should execute the tests without error


| Configuration Option               |   |   |   |   |   |   |   |   |   |   |   |   |
| ---------------------------------- | - | - | - | - | - | - | - | - | - | - | - | - |
| .env DATABASE_ENABLE_POSTGRES      | F | F | F | T | T | T | F | F | F | T | T | T |
| .env SESSION_ENABLE_POSTGRES       | F | F | F | T | T | T | F | F | F | T | T | T |
| .env SESSION_NOT_SESSION_COOKIE    | F | T | T | F | T | T | F | T | T | F | T | T |
| .env SESSION_SET_ROLLING_COOKIE    | F | F | T | F | F | T | F | F | T | F | F | T |
| clients-db.json trustedClient      | F | F | F | F | F | F | T | T | T | T | T | T |

Cookie and access_token expiration time may be tested by configuring the 
following expiration times in seconds in the .env file.
This will enable various timers which will make the test pause and run slowly.

| Configuration Option                        |   |
| ------------------------------------------- | - |
| ,env OAUTH2_CLIENT_TOKEN_EXPIRES_IN_SECONDS | 5 |
| ,ebv SESSION_EXPIRE_SEC                     | 8 |

The program includes a network request rate limiter that uses
the express-rate-limit middleware. The default is 10 requests 
per hour for GET /login and POST /login routes.
Exceeding the limit will return a 429 status response.
The following may be set in the .env file to disable this feature
by setting 1000 requests per hour.

```
LIMITS_PASSWORD_RATE_LIMIT_COUNT=1000
LIMITS_TOKEN_RATE_LIMIT_COUNT=1000
LIMITS_WEB_RATE_LIMIT_COUNT=1000
```

## Environment Variable Overrides

The following environment variables may be used to override the configuration 
defined in the .env file. Changing these values will not impact the actual 
server configuration. Rather, it is intended to allow adhoc substitution
of expected test result values. For example if the configured username 
is set to "bob" in the server configuration, the value "bob" will be imported
from the configuration for automatic use in the tests.
In order to allow adhoc testing without having to change the configuration
files each time, adhoc values may be prepended on the command line
like the following example:

```bash
TESTENV_USERNAME=bob2 node debug/code-grant.js
```

Default values (For further info, see README in base repository folder, or /docs/)

```bash
TESTENV_CLIENTINDEX=0
TESTENV_USERINDEX=0
TESTENV_REDIRECTURIINDEX=0
TESTENV_AUTHURL=http://127.0.0.1:3500
TESTENV_CLIENTID=abc123
TESTENV_CLIENTSECRET=ssh-secret
TESTENV_REDIRECTURI=http://localhost:3000/login/callback
TESTENV_TRUSTEDCLIENT=false
TESTENV_USERNAME=bob
TESTENV_PASSWORD=bobssecret
```

| imported variable        | Env Var override         | Default value                                                             |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------- |
| testEnv.clientIndex      | TESTENV_CLIENTINDEX      | 0                                                                         |
| testEnv.userIndex        | TESTENV_USERINDEX        | 0                                                                         |
| testEnv.redirectURIIndex | TESTENV_REDIRECTURIINDEX | 0                                                                         |
| testEnv.authURL          | TESTENV_AUTHURL          | config.site.authURL                                                       |
| testEnv.clientId         | TESTENV_CLIENTID         | clients[testEnv.clientIndex].clientId                                     |
| testEnv.clientSecret     | TESTENV_CLIENTSECRET     | clients[testEnv.clientIndex].clientSecret                                 |
| testEnv.redirectURI      | TESTENV_REDIRECTURI      | clients[testEnv.clientIndex].allowedRedirectURI[testEnv.redirectURIIndex] |
| testEnv.trustedClient    | TESTENV_TRUSTEDCLIENT    | clients[testEnv.clientIndex].trustedClient                                |
| testEnv.username         | TESTENV_USERNAME         | users[testEnv.userIndex].username                                         |
| testEnv.password         | TESTENV_PASSWORD         | users[testEnv.userIndex].password                                         |

Example command line override:

```bash
TESTENV_CLIENTSECRET="wrong_secret" node debug/code-grant.js
```

## Command line arguments

Execution of the debug test scripts will basically list
a passing result for each test. Setting these environment
variables from the command line will show additional 
information during test execution.

| Environment  | Description                                |
| ------------ | ------------------------------------------ |
| SHOWRES=1    | Print raw response body for each request   |
| SHOWRES=2    | Print response headers for each request    |
| SHOWRES=3    | Print both body and headers each request   |
| SHOWTOKEN=1  | Print JWT payload                          |
| SHOWTOKEN=2  | Print JWT introspect meta-data             |
| SHOWTOKEN=3  | Print JWT payload and introspect meta-data |
| SHOWCOOKIE=1 | Print request, response cookie             |

### For debugging writing of new tests

| Environment  | Description                                |
| ------------ | ------------------------------------------ |
| SHOWCHAIN=1  | Print chain object at end of tests (debug) |
| SHOWCHAIN=2  | Print chain object after each test (debug) |
| SHOWSTACK=1  | Error handler print stack                  |

Command line example:

```bash
SHOWRES=3 SHOWTOKEN=3 SHOWCOOKIE=1 SHOWSTACK=1 node debug/access-token.js
```

## Structure of JavaScript test files

Each test file contains a series of tests that are run sequentially.
The results of each test are available for use in subsequent tests.
Since the network fetch operations are run asynchronously,
the network requests are embedded in a chain of promises, where
various promises resolve after the network request has been 
completed and the response values parsed. The following pseudo code
shows the approach to a chain of tests.

```js
// ...
  .then((chain) => {
    // Set various fetch related variables
    chain.requestMethod = 'GET';
    chain.requestFetchURL = '/some/route/

    // Set any relevant testing variables
    chain.someVariables = someValue;

    // Resolved promise passes chain object to managedFetch function
    return Promise.resolve(chain)

  // The debug/modules/managed-fetch.js module is called.
  .then((chain) => managedFetch(chain))

  .then((chain) => {
    // Evaluate the results of the fetch operation
    if (chain.someValue === 'expected result') {
      doSomething()
    }

    // Assertion testing
    console.log('\tExpect: status === 302');
    assert.strictEqual(chain.responseStatus, 302);

    // Continue to the next test
    return Promise.resolve(chain)
  })
  // ...
  ```