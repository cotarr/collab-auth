# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Untagged

### Changed

- server/site.js - Upgrade options for express-rate-limit upgrade to v6 2022-03-19
- app.js update comments for helmet v5.0.1 (no code change) 2022-01-08

### Package updates

express-rate-limit@6.3.0

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
