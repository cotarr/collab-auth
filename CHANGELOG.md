# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## Next 2022-07-12

### Changed

- package.json - Bumped passport from v0.5.2 to v0.6.0 to address github dependabot security advisory realted to session fixation attack.
- server/site.js - Added callback function to req.logout() to support required breaking change in passport v0.6.0
- server/site.js - Added `keepSessionInfo: true` to passport.authenticate() to preserve callback URI after passport v0.6.0 upgrade.

### Changed
- Update express 4.17.3 to 4.18.1, express-rate-limit 6.3.0 to 6.4.0, express-session from 1.17.2 to 1.17.3, express-validator from 6.14.0 to 6.14.2
- Update dotenv from 16.0.0 to 16.0.1, ejs 3.1.7 to 3.1.8, helmet 5.0.2 to 5.1.0

## [v0.0.6](https://github.com/cotarr/collab-auth/releases/tag/v0.0.5) - 2022-05-03

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
