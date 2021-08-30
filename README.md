# collab-auth



This is one of 3 repositories

- collab-auth (Oauth2 Authorization Provider, redirect login, tokens)
- collab-frontend (Web server, reverse proxy, html content)
- collab-backend-api (Mock REST API using tokens to authorize requests)

### Security Note

No security review has been performed. No formal testing has been performed.

### Install node server

```bash
git clone git@github.com:cotarr/collab-auth.git
cd collab-auth
npm install
```

### Example Environment variables (showing defaults)

The `.env` file is supported.

```
SITE_VHOST=*
SITE_AUTH_URL=http://127.0.0.1:3500
SITE_OWN_HOST=127.0.0.1:3500
SERVER_TLS_KEY=../../server/certs/privatekey.pem
SERVER_TLS_CERT=../../server/certs/certificate.pem
SERVER_TLS=false
SERVER_PORT=3500
SERVER_PID_FILENAME=

SESSION_DISABLE_MEMORYSTORE=false
SESSION_EXPIRE_SEC
SESSION_SECRET

DATABASE_DISABLE_INMEM_DB=true
PGUSER
PGPASSWORD
PGHOST=sql.example.com  (or)  PGHOSTADDR=127.0.0.1
PGPORT=5432
PGDATABASE=collabauth
PGSSLMODE=disable
```

### Scopes

| Scope         | Permission              | Component  |
| ------------- | :---------------------- | :--------- |
| auth.none     | No access               | OAuth2 API |
| auth.info     | Check token status      | OAuth2 API |
| auth.token    | Issue new tokens        | OAuth2 API |
| auth.admin    | Reserved for future use | OAuth2 API |
| user.none     | No access               | Web control panel |
| user.password | Change own password     | Web control panel |
| user.admin    | Edit any record         | Web control panel |
| api.read      | Read only API requests  | Mock REST API |
| api.write     | API write requests      | Mock REST API |

### User configuration

At this time, users are read from static files with plain text credentials.
Copy example files to a new name.
Edit files: clients-db.json, users-db.json as needed.

```
cp -v example-clients-db.json clients-db.json
cp -v example-users-db.json users-db.json
```

### Certificates (Tokens)

This oauth2 implementation uses JWT tokens made with the jsonwebtoken npm library.
The token are encoded with a private key and decoded with a public certificate
using the "RS256" algorithm. These token files are located in the repository in the
following locations.

The certificate filenames should be included in your .gitignore file if they are located
in the repository.

```
server/certs/certificate.pem
server/certs/privatekey.pem
server/certs/README.md
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

Unless otherwise specified, the TLS certificates will fall back to the same
files that were generated for JWT token signature. This can be overwritten
with the environment variables shown above.

### Start with npm

```bash
npm start
```

The server can also be started manually with `node index.js` or `./index.js`

# Acknowledgements

The initial starting point for this application was copied
as a template application from Oauth2OrizeRecpies by Frank Hassanabad
https://github.com/FrankHassanabad/Oauth2orizeRecipes
