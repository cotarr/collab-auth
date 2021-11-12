# collab-auth

This is 1 of 4 repositories used on a collaboration project for learning oauth2orize and passport.
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

# Acknowledgments

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

The environment variable NODE_ENV should not exist or it may
be set to NODE_ENV=development.

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

|                      openssl prompt                         |   response  |     
| ----------------------------------------------------------- | ----------- |
| Country Name (2 letter code) [AU]:                          | .           |
| State or Province Name (full name) [Some-State]:.           | .           |
| Locality Name (eg, city) []:                                | .           |
| Organization Name (eg, company) [Internet Widgits Pty Ltd]: | collab-auth |
| Organizational Unit Name (eg, section) []:                  | .           |
| Common Name (e.g. server FQDN or YOUR name) []:             | collab-auth |
| Email Address []:                                           | .           |
| A challenge password []:                                    |             |
| An optional company name []:                                |             |

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

SESSION_ENABLE_POSTGRES=false
SESSION_EXPIRE_SEC=604800
SESSION_SECRET="A Secret That Should Be Changed"

# To enable PostgreSQL, set to true
DATABASE_ENABLE_POSTGRES=true
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
OAUTH2_EDITOR_SHOW_CLIENT_SECRET=false
OAUTH2_TOKEN_EXPIRES_IN_SECONDS=3600
OAUTH2_REFRESH_TOKEN_EXPIRES_IN_SECONDS=2592000
OAUTH2_CLIENT_TOKEN_EXPIRES_IN_SECONDS=86400

# When NODE_ENV=production, force logger to send access and admin log to console.
NODE_DEBUG_LOG=0
```

### Scopes

| Scope         | Permission                               | Component         |
| ------------- | :--------------------------------------- | :---------        |
| auth.info     | Client permission to check token status  | OAuth2 API        |
| auth.client   | Client permission to issue client tokens | OAuth2 API        |
| auth.token    | Client permission to Issue user tokens   | OAuth2 API        |
| auth.admin    | ( Reserved for future)                   | OAuth2 API        |
| user.password | Change own password                      | Web control panel |
| user.admin    | Edit any user or client record           | Web control panel |
| api.read      | API read requests (client && user)       | Mock REST API     |
| api.write     | API write requests (client && user)      | Mock REST API     |

### Client / User Configuration for Development

This section is for manual configuration of accounts in the development
environment. If you use the development configuration script above,
this part is not necessary.

In the development configuration, clients and users are read from static
files with plain text password credentials in JSON format.

To setup for development, copy example files to a new name.
Edit files: clients-db.json, users-db.json as needed.

```
cp -v example-clients-db.json clients-db.json
cp -v example-users-db.json users-db.json
```

### Database Configuration using PostgreSQL

When operating in the development environment as described above,
the database is emulated using data storage in RAM variables.
This is not suitable for deployment because all data will be
lost when the program is stopped.

For deployment to production, configuration options enable use of a PostgreSQL database
for storage of access tokens, refresh tokens, user accounts and client accounts.
When the database option is enabled, user passwords are hashed using bcrypt.
Client secrets are encrypted using crypto-js/aes for storage in the database.
Client secrets are visible in plain text using the editor in the admin panel.

Requirements:

This program was developed using PostgreSQL version 11.
Installation of the postgres UUID extension is required.
It is assumed you are familiar with installation of PostgreSQL,
creation of a new database, user account and password.
The database is running locally and the connection
will use localhost 127.0.0.1 without TLS encryption.
The firewall must protect the PostgreSQL port from external internet connections.
The npm package "pg" is used as a PostgreSQL client.
The pg client will use the following environment variables
to connect to the database at startup.
Use of a .env file is supported by dotenv.

```
PGUSER=xxxxxxx
PGPASSWORD=xxxxxxxx
PGHOSTADDR=127.0.0.1
PGPORT=5432
PGDATABASE=collabauth
PGSSLMODE=disable
```

Database storage is enabled with the following environment variable.
If this is not defined or not contain the string value "true" then
the program will revert back to the RAM memory storage option.

```
DATABASE_ENABLE_POSTGRES=true
```

Storage of program data requires 4 tables.
These tables can be created using the database command line client `psql`.
The file: `SQL-tools/create-oauth-tables.sql` includes SQL query utility commands.
These can by copy/paste directly into the psql client to better observe
the result and check for errors.

This is a list of required tables

|     Table     |          Description           |
| ------------- | ------------------------------ |
| accesstokens  | Issued access token meta-data  |
| refreshtokens | Issued refresh token meta-data |
| authclients   | Client id, name, client secret |
| authusers     | User id, name, hashed password |

A javascript utility located at `SQL-tools/create-postgres-admin-user.js`
can be used to create the an initial admin user account.
It is then possible to use the admin panel at "/panel/menu"
to login as the "admin" user and create any additional user or
client accounts that may be needed.
When run from the command line terminal, this will prompt
for input: User number (1000), Username (admin), Name (Admin Account), and Password.
This should be run from base folder of repository folder using:

```bash
npm run create-postgres-admin-user`.
```

### Session database storage.

The default development configuration uses the npm package "memorystore"
to store session information from express-session. Memorystore is a
memory safe implementation of RAM memory storage of HTTP sessions.
Each time the server is restarted, previous session data is lost,
so users must login each time the server is restarted.

Optionally, the npm package "connect-pg-simple" can be used to
store session data in a PostgreSQL database.

Session storage will use the same PostgreSQL database that was used previously
to store user and client accounts.
It is assumed the database has been created and the environment variables have been
configured to allow the pg client to connect at program startup (see instructions above).

One table needs to be created for storage of session data. There is a SQL script
located at `SQL-tools/create-session-table.sql` that contains SQL query commands
to create the required database table. The contents can be copy/pasted into the
psql terminal database client.

After the table has been created, PostgreSQL database storage is enabled using
the following environment variable.
If this is not defined or not contain the string value "true" then
the program will revert back to memorystore.

```
SESSION_ENABLE_POSTGRES=true
```

### Certificates (Oauth JWT Tokens)

This oauth2 implementation uses JWT tokens made with the jsonwebtoken npm library.
JWT tokens are encoded with a private key and decoded with a public certificate
using the "RS256" algorithm. These token files are located in the repository in the
following locations.

The certificate filenames should be included in your .gitignore file if they are located
in the repository.

```
data/token-certs/certificate.pem
data/token-certs/privatekey.pem
data/token-certs/README.md
```

* Entry of period [.] will skip an input

|                      openssl prompt                         |   response  |     
| ----------------------------------------------------------- | ----------- |
| Country Name (2 letter code) [AU]:                          | .           |
| State or Province Name (full name) [Some-State]:.           | .           |
| Locality Name (eg, city) []:                                | .           |
| Organization Name (eg, company) [Internet Widgits Pty Ltd]: | collab-auth |
| Organizational Unit Name (eg, section) []:                  | .           |
| Common Name (e.g. server FQDN or YOUR name) []:             | collab-auth |
| Email Address []:                                           | .           |
| A challenge password []:                                    |             |
| An optional company name []:                                |             |

The following console commands can be used to generate the certificates.

```bash
openssl genrsa -out privatekey.pem 2048
openssl req -new -key privatekey.pem -out certrequest.csr
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
rm -v certrequest.csr
```

The certificate filenames should be included in your .gitignore file.

### Certificates (Web server TLS)

When deployed for use on the internet, valid domain certificates
should be used for encryption of https requests to the server and
verification of the hostname.
The express/node.js web server will read TLS certificates at startup
using configuration settings. The following can be set using
Unix environment variables or including in a .env file.
Edit the filenames as needed.

```
SERVER_TLS_KEY=key.pem
SERVER_TLS_CERT=cert.pem
SERVER_TLS=true
```
