# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.0.24](https://github.com/cotarr/collab-auth/releases/tag/v0.0.24) 2024-01-25

### Changed

Refactored some code from v0.0.23 related to expiration of session in the express-session store.
The change does not alter the functionality of the expiration check from v0.0.23.
It was recoded to be consistent with related repository collab-frontend. 
More descriptive variables names were also used.

- In server/site.js - Removed middleware from POST /login route that was used to add login timestamp to the session.
- In server/auth.js - Added code to the passport localStrategy 'local' callback function to add login timestamp to the session.
- In server/session-auth.js - In the auth.check() function, refactored check for session expiration to match other changes.

Deprecated and removed configuration variable SESSION_NOT_SESSION_COOKIE. 
This was not compatible with some of the middleware libraries.
After removal, the server will act as if SESSION_NOT_SESSION_COOKIE=true.

Cookies and sessions now have 2 options:

- SESSION_SET_ROLLING_COOKIE=false - The session will expire at a fixed time after user login.
- SESSION_SET_ROLLING_COOKIE=true - The session expiration time will be updated with each request.

The session expiration time is configured using SESSION_EXPIRE_SEC in the .env file.

## [v0.0.23](https://github.com/cotarr/collab-auth/releases/tag/v0.0.23) 2024-01-17

This update added the capability to disable client accounts in the client database.

A new client.clientDisabled property allows creation of temporary client 
accounts for testing or development purposes that may be disabled 
or enabled from the admin panel while preserving the client credentials. 
This also makes the client accounts symmetrical with the user accounts 
that already ad a "loginDisabled" property.

### Changes

The schema for a client account was updated to add a new 
property "clientDisabled" of type boolean as described below:

server/admin-panel.js - The admin account editor was updated to provide a 
checkbox on the client account edit forms to enable and disable the client
account. Several HTML ejs view template files were updated as part of this change.
Color highlighting was added to better show disabled accounts.

server/db/mem-client.js - For the RAM memory database option, updated the 
client account object to handle the new clientDisabled property. 
For backward compatibility, during loading of the "client-db.json" file, 
if the clientDisabled property is not present, it is added and set 
to false (account enabled). The RAM memory option uses RAM variables 
to emulate database for demonstration mode where changes are discarded 
when the server is shut down.

server/db/pg-client.js - For the PostgreSQL database option, the SQL queries 
were updated to add the new "clientDisabled" column to the "authclients" table 
in the "collabauth" database. For backward compatibility where an existing 
client table does not have a clientDisabled column, upon starting the server, the 
client table is retrieved, and if the old schema is found, the following SQL query
is run to add the new column with clientDisabled set to false (account enabled).

The server automatically runs this SQL query at start (Only if schema update needed):

```sql
ALTER TABLE authclients ADD COLUMN "clientDisabled" boolean NOT NULL DEFAULT FALSE;
```
server/validate.js - The `validate.client()` function was updated to fail validation 
when clientDisabled property is set to true. This will deny access to API routes
that use Basic Auth with base64 encoded client credentials. These are:
POST /oauth/token, POST /oauth/introspect, POST /oauth/token/revoke.

server/validate.js - The `validate.token()` function was updated to fail validation 
when clientDisabled property is set to true for the client account that created
the access token. This will return an error for API route 
POST /oauth/introspect, used to validate submitted tokens.

server/oauth2.js - Those oauth2orize callback functions have been updated 
to return a status 401 error to outh2orize when the client.clientDisabled 
property is set to true.

server/oauth2.js - The express route handler for GET /dialog/authorize was updated to
to throw an error when lookup of the "client_id" query parameter has the
client.clientDisabled property set to true. This is a public OAuth 2.0 route that
does not require authentication. Oauth2orize handles this case with a 302 redirect back
to the calling web server's redirect URI with the error message:
"Status: 502, Bad Gateway, Client account disabled". 

server/oauth2.js - For the case of OAuth 2.0 authorization code grant 
where client.trustedClient is false, the route handler for route 
GET /dialog/authorize/decision is authorized by the users session 
cookie and by a random nonce "transaction" parameter that is included in 
the 302 redirect from GET /dialog/authorize. In this request, no client account 
lookup is performed. The request is authorized by matching the cookie, CSRF token, and 
the transaction code before redirecting with a new OAuth 2.0 code grant authorization code. 
THerefore, no explicit clientDisabled check was added to /dialog/authorize/decision

server/input-validation - Updated input validation for new schema.

SQL-tools/create-oauth-tables.sql - The SQL queries to create PostgreSQL tables
were updated to include the clientDisabled column.

example-clients-db.json - Added `clientDisabled: false` to client accounts.

docs/admin.html - Update documentation for use of admin panel.

## [v0.0.22](https://github.com/cotarr/collab-auth/releases/tag/v0.0.22) 2024-01-14

### Changed

Improved debug test scripts in the /debug/ folder.
No changes to the server code were included in v0.0.22.

## [v0.0.21](https://github.com/cotarr/collab-auth/releases/tag/v0.0.21) 2024-01-11

This update is a generally an improvement to cookie/session handling with some
unrelated items included.

### Fixed

Issue: 

Calls to /dialog/authorize or /panel/menu modify the user's session
session by adding a "returnTo" property to the session object.
The purpose is to remember the original URL and return
the browser to the original URL after password entry.
The subsequent redirect loads the login form at route GET /login.
The login form modifies the session object by adding a CSRF token 
to the session object.

When using PostgreSQL as a session store with connect-pg-simple,
occasionally, the second call to /login retrieves the
session record from the session store database before the
previous request has finished writing the returnTo property
to the session store. Saving the CSRF token
the session's record in the session store may 
therefore overwrite the previous returnTo value,
resulting in a 302 redirect to the page /redirecterror.
This has been an intermittent problem over the life of this program.

Fix:

Added a fixed timer as a middleware function to the GET /login route
to introduce a small time delay before express-session and passport
middleware will process the request. The new timer allows the previous 
request to complete updating the record in the session store PostgreSQL 
database before it is modified a second time. The timer only 
impacts the GET /login route. The timer is disabled when using 
memorystore as session store as this problem was not observed 
when using memorystore.

An IP address rate limiter previously used for POST /login requests was 
also added in front of the time delay middleware function for the GET /login route.

### Fixed

Issue:

There is an issue where fixed expiration cookies or sessions cookies 
may be treated as rolling cookies, where the expiration time of the 
session is extended with each request.

There are 3 cookie/session configurations defined in the .env file.

| Configuration              | 1-session | 2-fixed  | 3-rolling |
| -------------------------- | --------- | -------- | --------- | 
| SESSION_NOT_SESSION_COOKIE | false     | true     | true      |
| SESSION_SET_ROLLING_COOKIE | false     | false    | true      |

1 - When configured as session cookie, a new cookie is 
created and sent to the browser where the Expires= value omitted
from the set-cookie header in the response.
As long a subsequent requests include the same cookie,
the set-cookie header is not added to the response.
When the browser is closed, session cookies are discarded.

2 - When configured as fixed expiration cookie, a new cookie 
is created and a set-cookie header is returned to the 
browser with an Expires= value indicating the life of the cookie.
As long a subsequent requests include the same cookie,
the no set-cookie header will added to the response.
This maintains the original Expires= value in the browser
cookie jar.

3 - When configured as rolling cookie, a new cookie 
is created and a set-cookie header is returned to the 
browser with an Expires= value indicating the life of the cookie.
Each subsequent request will include a set-cookie header on
every response, and each response will change the value
of the Expires= value, extending the life of the cookie with each request.

On the server end, each session is a database record stored
in the session store, either memorystore or connect-pg-simple.
The session store configuration accepts a TTL (Time to Live)
value and a time interval where stale sessions are purged.

There are multiple inter-related configurations.
The `express-session` middleware defines cookie creation. 
The session store modules `memorystore` or `connect-pg-simple` 
define time to live for records in the session store database.
There is strategy configuration for the `passport` authorization
middleware determines if a session is authorized or not. 
Some requests are handed off to the `oauth2orize` server related 
to OAuth 2.0 functionality.

In certain configurations of the above modules, the last modified 
time of the session's record may be 'touched' with each request, 
extending the expiration of the session record in the session store.
Additionally, certain routes may modify the session record,
such as adding a CSRF token, which may trigger a new 
cookie Expires= value as well as touch the session record timestamp.

This could potentially allow a session cookie or fixed expiration cookie
to act as a rolling cookie, with extended expiration. However, 
it would not allow access to protected routes without a valid cookie.

Fix:

Created a new module server/session-auth.js. This is a custom module to replace
connect-ensure-login npm module. The route handler for the POST /login route
where the user submits username and password, a new middleware 
function `updateSessionExpireTime()` will add the intended expiration 
time to the session. 

The new function `checkSessionAuth()` replaced `ensureLoggedIn()` for all 
protected routes in the server/admin-panel.js, the /dialog/authorize and 
/dialog/authorize/decision routes in server/oauth2.js, and the 
/redirecterror, GET /changepassword, POST /changepassword routes in site.js.
The connect-ensure-module was removed from package.json.

Example:

```js
const checkSessionAuth = require('./session-auth');
app.get('/somewhere', checkSessionAuth(), renderPage); 
```

For cookie and session handling in express-session options object, 
when configured to use memorystore as the memorystore configuration property "stale"
was changed from true to `stale: false`. This is to prevent expired cookies from being 
retrieved by memorystore on the first request after expiration.

For cookie and session handling in express-session options object, 
when configured to use connect-pg-simple as the session store, 
the connect-pg-simple configuration property "disableTouch" was 
added and set to true when
SESSION_NOT_SESSION_COOKIE=true and SESSION_SET_ROLLING_COOKIE=false,
else it is set to false. When configured for fixed expiration cookies,
the session's record does not require modification since the expiration
time is not intended to change.

Unresolved issue: In certain configurations and certain routes, the 
browser may receive a set-cookie header with revised expiration 
time, like a rolling cookie. However, unless the authorization 
server is explicitly configured for rolling cookies, the server 
will no longer accept requests past the original expiration time 
that was defined during the POST /login handler for the 
username/password login.

### Added (feature)

As a feature, the new session-auth.js module includes an array `loginRedirectRoutes`
containing a list of path names, such as "/panel/menu" that will be allowed 
to remember the original URL by saving it as a returnTo value in the session's record.
The main benefit of this array is to exclude administration panel 
account data entry forms from being auto-resumed after a user login redirect.

As a feature, the session-auth.js module authorization function will
accept an optional options object. An optional property "failRedirectTo" 
is used to define a redirection URL for use after an authorization failure.
An array `allowedAlternateRedirectRoutes` listing allowed redirect 
routes is configurable in the session-auth.js source file. 
In the case no failRedirectTo value is defined, the failed login will 
redirect to "/login" if the original route is listed in the 
loginRedirectRoutes, else return 401 Unauthorized.

Example:

```js
const checkSessionAuth = require('./session-auth');
app.get('/somewhere',
  checkSessionAuth({ failRedirectTo: '/error.html' }),
  renderPage); 
```

The failRedirectTo property should not be set to '/login'
as this defeats the returnTo value that would be stored in the session.
The intended way is to call checkSessionAuth() without an argument
so it will redirect to the /login route by default for configured routes.

### Added

Added a web page to the admin panel "/panel/unauthorized" which will
inform the user when the session is expired and provide a link back
to /panel/menu.

Updated the server/admin-panel.js module to use the /panel/unauthorized
URL for the case of editing panels that do not automatically redirect 
to the /login route.

In summary, the admin panel pages that do not involve
form input (editing) may be bookmarked, and will redirect to /login as needed.
Unauthorized requests to pages involving edit forms will redirect to the 
/panel/unauthorized information page.

### Added 

Added a web page to inform users when making requests where the 
user's account configuration does not have sufficient scope
to access the resource.

Updated the server/scope.js file to render the insufficient scope page.

### Changed

Removed the "Change password" button from the footer bar of the /logout response page.

### Fixed

Invalid configuration where SESSION_NOT_SESSION_COOKIE=false and SESSION_SET_ROLLING_COOKIE=true 
in now corrected in server/config/index.js. A console.log configuration warning is shown 
at program start. The configuration variable notSessionCookie is forced to to true 
when rollingCookie is true. Rolling cookies send new expiration time to the browser
with each response, while session cookies are valid until the browser is closed, but do not expire.
However, stale session cookies are pruned from the session store on a timer.

### Added (Security improvement)

Note: all of the above discussion in v0.0.21 refers to cookies.
This change refers to JWT access_tokens and refresh tokens.

In the access_token validation module server/validate.js, the JWT token validation 
function was improved by adding an explicit check of the token expiration time 
stored in the token database as token meta-data. This means that for a token to be valid, the 
server's system clock must not exceed either the expiration time within the JWT
token payload or the expiration time stored in the token's meta-data in the token database.

### Changed

In server/app.js, moved the route handlers for paths '/oauth/token', 
'/oauth/introspect', and '/oauth/token/revoke' earlier in the file before the 
express-session and passport middleware. These routes authenticate with Basic Auth using client 
credentials to perform access_token functions. These calls do not require cookies, nor 
should they return a cookie.

### Added

In response to GitHub CodeQL security scan, a network request IP address rate limit
was added using express-rate-limit middleware. API routes related to access token functions
may be configured with a different limit from browser web requests. The following new
configuration values are applicable in the .env file.

```
LIMITS_TOKEN_RATE_LIMIT_COUNT=1000
LIMITS_TOKEN_RATE_LIMIT_MS=3600000
LIMITS_WEB_RATE_LIMIT_COUNT=1000
LIMITS_WEB_RATE_LIMIT_MS=3600000
```

### Debug tests

- Update ThunderClient collections to incorporate /panel/unauthorized and /noscope routes.

- Added new folder /debug/ which contains several javascript files used to debug requests (see /debug/README.md)

### dependencies

- Remove connect-ensure-login
- Update connect-pg-simple@9.0.1, passport@0.7.0, express-rate-limit@7.1.5, helmet@7.1.0


## [v0.0.20](https://github.com/cotarr/collab-auth/releases/tag/v0.0.20) 2023-11-05

### Security

Updated npm dependency crypto-js 4.1.1 to 4.2.0 to address GitHub Dependabot 
security audit notification.

Comments:

In collab-auth the crypto-js npm module is used to perform crypto-js AES encryption of
the client secret in client account record stored in postgresql database.

The dependabot alert was issued to address a weakness in the crypto-js PBKDF2 functionality.
PBKDF2 is a password-based key derivation function.

### Changed

File: server/input-validation.js - Modified input validation for the "/dialog/authorize"
route to accept an optional URL query parameter "state". Previously, adding the state
query parameter would return a 422 status. The oauth2orize library supports 
the recommended "state" query parameter, so no other code changes were required.
The state parameter is used during the oauth 2.0 handshake to pass a nonce used 
to reduce the risk of CSRF attacks during web directs. Other grant types were not modified.

Updated the collab-auth API test collection "thunder-collection_collab-auth-demo.json" 
for authorization code grant to use the "state" query parameter.

The VSCode extension ThunderClient has added a limit of 50 requests per collection, 
so the test collection "thunder-collection_collab-auth-tests.json" was broken 
into multiple files of less tha 50 requests.

Update Dependencies:

- express-rate-limit 6.7.0 to 7.1.3
- jsonwebtoken 9.0.0 to 9.0.2
- oauth2orize 1.11.1 to 1.12.0
- pg 8.11.1 to 8.11.3
- rotating-file-stream 3.1.0 to 3.1.1
- uuid 9.0.0 to 9.0.1

- Development dependencies: eslint (and dependencies)

Updated /docs/. The tutorial section of the /docs/installation.html page was 
updated to address a change in collab-frontend repository.
The passport configuration object in collab-frontend was modified to 
add CSRF protection to the authorization code redirects.
The tutorial example log files were updated show and explain this change.

## [v0.0.19](https://github.com/cotarr/collab-auth/releases/tag/v0.0.19) 2023-07-25

There are no code changes in this commit.

The Postman desktop client has deprecated the scratch pad feature.
It is no longer possible to operate Postman using local files.

The VSCode extension Thunder Client was selected as a replacement.
The postman collections have been converted to Thunder Client format.
Instructions for the new collections are in thunderclient/README.md

The legacy postman collections can be found in commit 
42af99263103f249f098047d3254bf8d8c4bd25d from 2023-07-13.

## [v0.0.18](https://github.com/cotarr/collab-auth/releases/tag/v0.0.18) 2023-07-09

Version v0.0.18 is a /doc/ update. No code was changed. The documentation 
was updated to reflect some recent changes in collab-frontend
including some new screen captures and updated descriptions.

## [v0.0.17](https://github.com/cotarr/collab-auth/releases/tag/v0.0.17) 2023-06-30

- Log file rotation now allows by file size using env variable SERVER_LOG_ROTATE_SIZE.
- Log file permission changed from 0o644 to 0o600.
- Update /docs/ and README.md to show log rotation configuration.

- Minor updates to postman collections

- Added check for disabled cookies.

Issue: when attempting to authenticate with browser cookies disabled
the response error showed "Forbidden, invalid csrf token".
The csrf message is misleading. Added a new middleware function
to server/site.js for the POST /login route to check for existence of a cookie. 
If no cookie is found, respond with status 403 "Forbidden, cookie not 
found. Cookies may be blocked by browser"

## [v0.0.16](https://github.com/cotarr/collab-auth/releases/tag/v0.0.16) 2023-06-29

Dependency updates...

- Npm audit: install semver@7.5.3, edit package-lock.json, run npm audit-fix, successfully cleared audit warnings.
- Upgrade dependencies pg@8.11.1, dotenv@16.3.1, connect-pg-simple@9.0.0, @dr.pogodin/csurf@1.13.0
- Upgrade helmet@7.0.0 and edit app.js to address 7.0.0 changes.
- Upgrade eslint and dependencies to eslint@8.43.0 and fix new linting errors.
- Upgrade express-validator from v6 to v7 with edits in server/input-validation.js 
to accommodate breaking changes in v7.

## [v0.0.15](https://github.com/cotarr/collab-auth/releases/tag/v0.0.15) 2023-04-12

- Update all npm packages to latest version
- Delete and regenerate a new package-lock.json

## [v0.0.14](https://github.com/cotarr/collab-auth/releases/tag/v0.0.14) 2023-03-20

### Added

Added optional http access log filename rotation using the npm rotating-file-stream package.
Log rotation can be enabled by setting the env variable SERVER_LOG_ROTATE_INTERVAL 
to a string value such as "1h" or "7d". 

Added env variable SERVER_LOG_FILTER that when set to the string value "error",
the http access log will filtered so the log will include only http status codes >=400.

Log rotation and filtering is only applicable to the http access log (logs/access.log).
The auth.log file is not rotated.

## [v0.0.13](https://github.com/cotarr/collab-auth/releases/tag/v0.0.13) 2023-01-11

### Changed

The npm security advisory for debug package has been updated to 
to incorporate backport debug@2.6.9 as safe. Manual edit of package-lock.json is 
no longer required.

- Deleted package-lock.json. Ran npm install to create a new package-lock.json.

## [v0.0.12](https://github.com/cotarr/collab-auth/releases/tag/v0.0.12) 2023-01-11

### Changed

This is to address npm audit warning for npm dependency debug<=3.1.0

- Deleted package-lock.json
- Upgrade dev dependency eslint-plugin-n@15.6.1
- In package-lock.json, to fix npm audit advisory replace all instance of debug<=3.10 with current debug@4.3.4

## [v0.0.11](https://github.com/cotarr/collab-auth/releases/tag/v0.0.11) 2023-01-01

### Changed

Replaced deprecated package `csurf` with forked repository `@dr.pogodin/csurf`. 
This package is used to validate CSRF tokens included with POST requests to 
reduce risk of cross site request forgery attempts. 

The forked version is a direct replacement for csurf@1.11.0. No code changes were required.

Update dependencies: connect-pg-simple@8.0.0, helmet@6.0.1, pg@8.8.0, uuid@9.0.0

Update dev-dependencies: eslint@8.31.0 + new eslint dependencies

## [v0.0.10](https://github.com/cotarr/collab-auth/releases/tag/v0.0.10) 2022-12-23

### Changed

package.json - Bumped jsonwebtoken from v8.5.1 to v9.0.0 to address github dependabot security advisory related to jwt.verify()

## [v0.0.9](https://github.com/cotarr/collab-auth/releases/tag/v0.0.9) 2022-11-20

### Added

Node/Express configuration change.

- Added 5 second web server timeout for new connections to perform TLS handshake
- Added 5 second web server timeout for web browser to complete the initial HTTP request

### Changed

- Update dev dependency eslint@8.28.0 with new eslint dependencies an update eslintrc.js
- Update express@4.18.2, dotenv@16.0.3, express-rate-limit@6.7.0, helmet@6.0.0

## [v0.0.8](https://github.com/cotarr/collab-auth/releases/tag/v0.0.8) 2022-11-13

### Changed

- package-lock.json - Bumped minimatach v3.0.4 to v3.1.2, npm audit fix to address github dependabot alert.

## [v0.0.7](https://github.com/cotarr/collab-auth/releases/tag/v0.0.7) 2022-07-12

### Changed

- package.json - Bumped passport from v0.5.2 to v0.6.0 to address github dependabot security advisory realted to session fixation attack.
- server/site.js - Added callback function to req.logout() to support required breaking change in passport v0.6.0
- server/site.js - Added `keepSessionInfo: true` to passport.authenticate() to preserve callback URI after passport v0.6.0 upgrade.
- server/app.js - On startup, console log shows admin panel status as Enabled or Disabled

### Changed
- Update express 4.17.3 to 4.18.1, express-rate-limit 6.3.0 to 6.4.0, express-session from 1.17.2 to 1.17.3, express-validator from 6.14.0 to 6.14.2
- Update dotenv from 16.0.0 to 16.0.1, ejs 3.1.7 to 3.1.8, helmet 5.0.2 to 5.1.0

## [v0.0.6](https://github.com/cotarr/collab-auth/releases/tag/v0.0.6) - 2022-05-03

### Changed

- Update ejs package version from 3.1.6 to 3.1.7 to address github dependabot security advisory.

## [v0.0.5](https://github.com/cotarr/collab-auth/releases/tag/v0.0.5) - 2022-03-30

### Changed

- npm audit fix - bump mimimist 1.2.5 to 1.2.6 to address github dependabot security advisory for prototype pollution.

## [v0.0.4](https://github.com/cotarr/collab-auth/releases/tag/v0.0.4) - 2022-03-19

### Changed

- server/site.js - Upgrade options for express-rate-limit upgrade to v6 2022-03-19
- app.js update comments for helmet v5.0.1 (no code change) 2022-01-08
- .github/workflows/codeql-analysis.yml - Disable CodeQL cron schedule.

### Package updates

dotenv@16.0.0, express@4.17.3, express-rate-limit@6.3.0, helmet@5.0.2, memorystore@1.6.7, pg@8.7.3

## [v0.0.3](https://github.com/cotarr/collab-auth/releases/tag/v0.0.3) - 2022-01-08

### Fixed
- mem-clients.js RAM memory database, update function for edit client record missing trustedClient property causing change to be ignored 2022-01-08
- input-validation.js create client missing trustedClient property causing 422 response 2022-01-08
- input-validation.js create or edit client would not accept multiple redirect URI due to missing comma in `usrAllowedChars` 2021-12-30

### Changed

- Update helmet version from v4 to v5.0.1 2022-01-08
- Additional improvement of /docs 2022-01-08
- Edit JavaScript comments (no code changes) 2022-01-05
- Updated postman collections. 2021-12-28

## [v0.0.2](https://github.com/cotarr/collab-auth/releases/tag/v0.0.2) - 2021-12-27

### Changed

- server/scope.js - scopeToArray() Added type check to argument to fix CodeQL issue.

## [v0.0.1](https://github.com/cotarr/collab-auth/releases/tag/v0.0.1) - 2021-12-26

### Changed

- Set tag v0.0.1
- Changed github repository visibility to public
- Enabled github CodeQL

## 2021-10-18 

### Milestone

Deploy on personal web page for active debugging.

## 2021-08-28

### Changed

Re-base repository to latest commit

## 2021-08-03

### New Repository

Template based on "/authorization-server/" folder in the github repository at
https://github.com/FrankHassanabad/Oauth2orizeRecipes (MIT License)
