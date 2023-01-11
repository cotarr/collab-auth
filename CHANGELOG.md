# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
