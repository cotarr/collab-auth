# collab-auth

This is 1 of 4 repositories used on a collaboration project for learning oauth2orize and passport.
The concept involves setup of a home network oauth2 server that could be used to restrict
access to a personal web server, database API, and home network IOT devices.
This repository will use the oauth2orize library. Users records and sessions can be
temporarily stored in memory during development or configured to use PostgreSQL.
This is a learning project and will require additional work before considering use in a production.


|                        Repository                                  |                   Description                         |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| collab-auth                                                        | Oauth2 Authorization Provider, redirect login, tokens |
| [collab-frontend](https://github.com/cotarr/collab-frontend)       | Mock Web server, reverse proxy, HTML content          |
| [collab-backend-api](https://github.com/cotarr/collab-backend-api) | Mock REST API using tokens to authorize requests      |
| [collab-iot-device](https://github.com/cotarr/collab-iot-device)   | Mock IOT Device with data acquisition saved to DB     |

# Acknowledgements

The initial starting point for this application was copied
as a template application from Oauth2OrizeRecpies by Frank Hassanabad
https://github.com/FrankHassanabad/Oauth2orizeRecipes

### Security Note

No security review has been performed.

In the development configuration, passwords are stored in plain text in local files.

### Install node server for development environment

```bash
git clone git@github.com:cotarr/collab-auth.git
cd collab-auth
npm install
```

### Setup development configuration

Running the server in development mode will require 3 things.

- A file to define user accounts with login username and password
- A file to define client accounts with client id and client secret
- Certificates to sign and verify JWT tokens.

There is a bash script named `config-dev-script.sh` that
will automate these 3 things for setup of a development server.
You should review this script before use.

The script will copy example user template and client template
to working files to define users and clients in the development environment.
In the development server, the passwords within these files are stored in plain text.

This will run openssl to generate certificates.
The certificates are used by the program to sign and verify access_tokens.
Running openssl will prompt the input for various inputs.
Inputs can be skipped by entering a period [.].
The recommended entry "collab-auth" is entered into 2 required field for
"Organization Name" and "Common Name."

The environment variable NODE_ENV should not exist or it may
be set to NODE_ENV=development.

No additional configuration is required to start a development server.

```bash
npm run config-dev-script
```

### Start with npm

```bash
npm start
```

The server can also be started with `node bin/www`

### Administrator Login

A simple administrator web page may be accessed at `http://127.0.0.1:3500/panel/menu`.
This is a very simple page with limited functions to add or modify user records and client records.
To gain access to the administrator page, a user account must be assigned the role "user-admin".
It is recommended an admin user be a dedicated account, and that the user-admin role not be
added to commonly used accounts. Usernames and real names are currently restricted to
A-Z a-z 0-9 characters. In development mode, user and client account records are loaded from
static files when the server starts, and changes to users and client account records are not saved.
If configured for PostgreSQL, changes will be saved to the database.

### User password changes

Users may change their own passwords using `http://127.0.0.1:3500/changepassword`.
A user account must be assigned the role "user.password" or "user.admin" to gain access
to this page and change passwords.

### Example Environment variables (showing defaults)

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

SESSION_DISABLE_MEMORYSTORE=false
SESSION_EXPIRE_SEC=604800
SESSION_SECRET="A Secret That Should Be Changed"

# To enable PostgreSQL, set to true
DATABASE_DISABLE_IN_MEMORY_DB=true
PGUSER=xxxxx
PGPASSWORD=xxxxx
PGHOST=sql.example.com  (or)  PGHOSTADDR=127.0.0.1
PGPORT=5432
PGDATABASE=collabauth
PGSSLMODE=disable

OAUTH2_DISABLE_TOKEN_GRANT=false
OAUTH2_DISABLE_CODE_GRANT=false
OAUTH2_DISABLE_CLIENT_GRANT=false
OAUTH2_DISABLE_PASSWORD_GRANT=false
OAUTH2_DISABLE_REFRESH_TOKEN_GRANT=false
OAUTH2_TOKEN_EXPIRES_IN_SECONDS=3600
OAUTH2_REFRESH_TOKEN_EXPIRES_IN_SECONDS=2592000
OAUTH2_CLIENT_TOKEN_EXPIRES_IN_SECONDS=86400

# When NODE_ENV=production, force logger to send access and admin log to console.
NODE_DEBUG_LOG=0
```

### Scopes

| Scope         | Permission                               | Component  |
| ------------- | :--------------------------------------- | :--------- |
| auth.none     | No access                                | OAuth2 API |
| auth.info     | Client permission to check token status  | OAuth2 API |
| auth.client   | Client permission to issue client tokens | OAuth2 API |
| auth.token    | Client permission to Issue user tokens   | OAuth2 API |
| auth.admin    | ( Reserved for future)                   | OAuth2 API |
| user.none     | No access                                | Web control panel |
| user.password | Change own password                      | Web control panel |
| user.admin    | Edit any user or client record           | Web control panel |
| api.read      | API read requests (client && user)       | Mock REST API |
| api.write     | API write requests (client && user)      | Mock REST API |

### User configuration

In the development configuration, clients and users are read from static
files with plain text credentials in JSON format.
To setup for development, copy example files to a new name.
Edit files: clients-db.json, users-db.json as needed.

```
cp -v example-clients-db.json clients-db.json
cp -v example-users-db.json users-db.json
```

Optional configuration allows use of a PostgreSQL database to store account records.

Instructions to create SQL tables: TBD

### Certificates (Tokens)

This oauth2 implementation uses JWT tokens made with the jsonwebtoken npm library.
The token are encoded with a private key and decoded with a public certificate
using the "RS256" algorithm. These token files are located in the repository in the
following locations.

The certificate filenames should be included in your .gitignore file if they are located
in the repository.

```
data/token-certs/certificate.pem
data/token-certs/privatekey.pem
data/token-certs/README.md
```

The following console commands can be used to generate the certificates.

* Entry of period [.] will skip an input
* For testing, the following were used
 * Organization = collab-auth
 * Common Name = collab-auth

```bash
openssl genrsa -out privatekey.pem 2048
openssl req -new -key privatekey.pem -out certrequest.csr
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
rm -v certrequest.csr
```

The certificate filenames should be included in your .gitignore file.

### Certificates (TLS)

A filename path can be set for express/node.js web server TLS certificates using
environment variables (see above).
