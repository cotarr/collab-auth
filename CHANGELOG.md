# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## next v0.0.21-dev DRAFT

## Fixed

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

An IP address rate limiter was added in front of the time 
delay middleware function.

## Fixed

Issue:

When configured for session cookies,
SESSION_NOT_SESSION_COOKIE=false (the default), there is no expiration time
associated with session cookies. Session cookies are valid until the browser is closed.
The authorization server will accept session cookies until the session's record 
in the session store database becomes inactive (no more requests) and the stale record
is pruned from the session database at fixed time intervals. This was working correctly.

When configured to use rolling cookies, 
SESSION_NOT_SESSION_COOKIE=true and SESSION_SET_ROLLING_COOKIE=true,
A revised expiration time is sent to the browser in a set-cookie
header for each request. Rolling cookies will be accepted by the server
until the elapsed time since the last request has exceeded
the cookie's expiration time. In other words the expiration time 
of the session's database record is 'touched' with each request 
while concurrently updated cookies are sent to the browser to match.
This was also working correctly.

On the other hand, when cookies are configured to use a fixed expiration time, 
SESSION_NOT_SESSION_COOKIE=true and SESSION_SET_ROLLING_COOKIE=false,
The cookies intended to remain valid until the elapsed time since 
the cookie was created exceeds the lifetime defined in the configuration.
However it appears that with certain configurations, the session store will 
touch (reset) the session expiration timestamp. Thus, cookies in the
fixed expiration configuration will act like rolling cookies.

Cause:

There are multiple inter-related configurations.
The express-session middleware defines cookie creation. 
The session store modules memorystore or connect-pg-simple 
define time to live for records in the session store database.
There is configuration for the passport authorization middleware
determines if a session is authorized or not. The requests may be
handed off to the oauth2orize server to issue OAuth 2.0 token 
related responses.

It appears that when configured for cookie of fixed expiration, 
SESSION_NOT_SESSION_COOKIE=true and SESSION_SET_ROLLING_COOKIE=false,
in certain configurations the last modified time of the 
session's record is 'touched' with each request, extending 
the session time to live (TTL).

Additionally, calls to the /dialog/authorize route may forward the request
to the oauth2orize middleware authorization server. It seems oauth2orize
independently updates the request processing to re-send
the set-cookie to the browser each time /dialog/authorize route is called.

This could potentially allow an expired session to
accept requests past it's fixed expiration time as long as repeated requests
are made with frequency less than the expiration time interval.

This only applies to the case of fixed expiration cookies.

Fix:

Created a new module server/session-auth.js. This is a custom module to replace
connect-ensure-login npm module. After the user enters the password during login,
the next request will store the original expiration time of the
cookie into the session's record in the session store database.
An explicit expiration check function checkSessionAuth() was added.

The new function `checkSessionAuth()` replaced `ensureLoggedIn()` for all 
protected routes in the server/admin-panel.js, the /dialog/authorize and 
/dialog/authorize/decision routes in server/oauth2.js, and the 
/redirecterror, GET /changepassword, POST /changepassword routes in site.js.
The connect-ensure-module was removed from package.json.

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

Continued issue: When configured for fixed expiration cookies, 
in certain configurations, the browser may receive a set-cookie header with 
revised expiration time, like a rolling cookie. However, unless the 
authorization server is explicitly configured for rolling cookies, 
the server will no longer accept requests past the original expiration time 
that was defined when the user entered their password at the login form.

## Added (feature)

As a feature, the new session-auth.js module includes an array `loginRedirectRoutes`
containing a list of path names, such as "/panel/menu" that will be allowed 
to remember the original URL by saving it as a returnTo value in the session's record.
The main benefit of this array is to exclude administration panel 
account data entry forms from being auto-resumed by a post login redirect.

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

## Added

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

## Added 

Added a web page to inform users when making requests where the 
user's account configuration does not have sufficient scope
to access the resource.

Updated the server/scope.js file to render the insufficient scope page.

## Changed

Removed the "Change password" button from the footer bar of the /logout response page.

## Fixed

Invalid configuration where SESSION_NOT_SESSION_COOKIE=false and SESSION_SET_ROLLING_COOKIE=true 
in now corrected in server/config/index.js. A console.log configuration warning is shown 
at program start. The configuration variable notSessionCookie is forced to to true 
when rollingCookie is true. Rolling cookies send new expiration time to the browser
with each response, while session cookies are valid until the browser is closed, but do not expire.
However, stale session cookies are pruned from the session store on a timer.

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
