# collab-auth

This is 1 of 4 repositories used on a collaboration project for learning 
[oauth2orize](https://www.npmjs.com/package/oauth2orize).
The concept involves setup of a home network oauth2 server that could be used to restrict
access to a personal web server, database API, and home network IOT devices.
This repository will use the oauth2orize library. Users records and sessions can be
temporarily stored in memory during development or configured to use PostgreSQL.
This is a learning project and will require additional work before considering use in a production.

|                        Repository                                  |                   Description                         |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| [collab-auth](https://github.com/cotarr/collab-auth)               | Oauth2 Authorization Provider, redirect login, tokens |
| [collab-frontend](https://github.com/cotarr/collab-frontend)       | Mock Web server, reverse proxy, HTML content          |
| [collab-backend-api](https://github.com/cotarr/collab-backend-api) | Mock REST API using tokens to authorize requests      |
| [collab-iot-device](https://github.com/cotarr/collab-iot-device)   | Mock IOT Device with data acquisition saved to DB     |

### Documentation:

https://cotarr.github.io/collab-auth

### Acknowledgments

The initial starting point for this application was copied
as a template application from Oauth2OrizeRecpies by Frank Hassanabad
https://github.com/FrankHassanabad/Oauth2orizeRecipes

### Security Note

No security review has been performed.

In the development configuration, passwords are stored in plain text in local files.

### Setup demo in development enviornment

See documentation at https://cotarr.github.io/collab-auth/installation.html

This project supports a simple pre-configured development mode.
The demo install assumes a secure development environment that is
isolated from the internet such as a virtual machine or other
development workstation that is protected behind a NAT router.

The environment variable NODE_ENV should not exist or it may
be set to NODE_ENV=development.

```bash
git clone git@github.com:cotarr/collab-auth.git
cd collab-auth
npm install
```

Running the server in development mode will require 3 things.

- A file to define user accounts with login username and password
- A file to define client accounts with client id and client secret
- Certificates containing RSA keys to sign and verify JWT tokens.

There is a bash script named `config-dev-script.sh` that
will automate these 3 things for setup of a development server.
You should review this script before use.

The script will copy example user accounts template and client accounts template
to working files to define users and clients in the development environment.
In the development server, the passwords within these files are stored in plain text.

The script will run openssl to generate a pair of files containing the RSA keys.
The RSA private key is used add a digital signature to a new token using the "RS256" algoithm.
The RSA public key is used to verify the signature whe then token is decoded.

The configuration script can be run with the following npm command:

```bash
npm run config-dev-script
```

### Start with npm

```bash
npm start
```

The server can also be started with `node bin/www`

### Administrator Login

See documentation at https://cotarr.github.io/collab-auth/admin.html

A simple administrator web page may be accessed at `http://127.0.0.1:3500/panel/menu`
using username `bob` and password `ssh-secret`.
This is a very simple page with limited functions to add or modify user records and client records.
To gain access to the administrator page, a user account must be assigned the role "user-admin".
It is recommended an admin user be a dedicated account, and that the user-admin role not be
added to commonly used accounts. Usernames and real names are currently restricted to
A-Z a-z 0-9 characters.

In development mode, user and client account records are loaded from
static files when the server starts, and changes to users and client account records are not saved.
If configured for PostgreSQL, changes will be saved to the database.

### User password changes

Users may change their own passwords using `http://127.0.0.1:3500/changepassword`.
A user account must be assigned the role "user.password" or "user.admin" to gain access
to this page and change passwords.

### Scopes

See documentation at https://cotarr.github.io/collab-auth/scope.html

| Scope         | Permission                               | Component            |
| ------------- | :--------------------------------------- | :------------------- |
| auth.info     | Client permission to check token status  | OAuth2 API           |
| auth.client   | Client permission to issue client tokens | OAuth2 API           |
| auth.token    | Client permission to Issue user tokens   | OAuth2 API           |
| auth.admin    | ( Reserved for future)                   | OAuth2 API           |
| user.password | Change own password                      | Password  Form       |
| user.admin    | Edit any user or client record           | Admin Account Editor |
| api.read      | API read requests (client && user)       | Mock REST API        |
| api.write     | API write requests (client && user)      | Mock REST API        |

### Example Environment variables

See documentation at https://cotarr.github.io/collab-auth/env.html

The `.env` file is supported using dotenv npm package

```
SITE_VHOST=*
SITE_AUTH_URL=http://127.0.0.1:3500
SITE_OWN_HOST=127.0.0.1:3500
SITE_SECURITY_CONTACT=security@example.com
SITE_SECURITY_EXPIRES="Fri, 1 Apr 2022 08:00:00 -0600"

SERVER_TLS_KEY=
SERVER_TLS_CERT=
SERVER_TLS=false
SERVER_PORT=3500
SERVER_PID_FILENAME=

SESSION_EXPIRE_SEC=604800
SESSION_SECRET="A Secret That Should Be Changed"
SESSION_ENABLE_POSTGRES=false

# To enable PostgreSQL, set to true
DATABASE_ENABLE_POSTGRES=true
DATABASE_DISABLE_WEB_ADMIN_PANEL=false

# Used directly by PostgreSQL client npm package pg
PGUSER=xxxxx
PGPASSWORD=xxxxx
PGHOST=sql.example.com  (or)  PGHOSTADDR=127.0.0.1
PGPORT=5432
PGDATABASE=collabauth
PGSSLMODE=disable

OAUTH_CLIENT_SECRET_AES_KEY="A Secret That Should Be Changed"
OAUTH2_DISABLE_TOKEN_GRANT=false
OAUTH2_DISABLE_CODE_GRANT=false
OAUTH2_DISABLE_CLIENT_GRANT=false
OAUTH2_DISABLE_PASSWORD_GRANT=false
OAUTH2_DISABLE_REFRESH_TOKEN_GRANT=false
OAUTH2_EDITOR_SHOW_CLIENT_SECRET=false
OAUTH2_TOKEN_EXPIRES_IN_SECONDS=3600
OAUTH2_REFRESH_TOKEN_EXPIRES_IN_SECONDS=2592000
OAUTH2_CLIENT_TOKEN_EXPIRES_IN_SECONDS=86400
```

Not supported in .env file

```
NODE_ENV=development
# When NODE_ENV=production, force logger to send access and admin log to console.
NODE_DEBUG_LOG=0
```

### Database Configuration using PostgreSQL

See documentation at https://cotarr.github.io/collab-auth/deployment.html


### Session database storage using PostgreSQL

See documentation at https://cotarr.github.io/collab-auth/deployment.html


### Certificates (Web server TLS)

See documentation at https://cotarr.github.io/collab-auth/deployment.html

```
SERVER_TLS_KEY=...some_path.../privkey.pem
SERVER_TLS_CERT=...some_path.../fullchain.pem
SERVER_TLS=true
SERVER_PORT=3500
```
