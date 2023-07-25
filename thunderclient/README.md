# API Test README.md


This README contains instructions for use of the VSCode extension Thunder Client 
to perform an OAuth2 workflow demonstration with the collab-auth authorization server.

## Legacy postman collections

The legacy postman collections can be found in the "postman/" folder in commit 
42af99263103f249f098047d3254bf8d8c4bd25d from 2023-07-13.

## collab-auth configuration

Complete instructions for setup are included in the /docs folder.

The collab-auth server should be setup in an isolated environment like a virtual machine.
In this demonstration, TLS is disabled so the server should not be exposed to the internet.
The collab-auth server should be listening on 127.0.0.1 port 3500.
The example user account and client account files should be installed.

- The file example-clients-db.json copied to clients-db.json
- The file example-users-db.json copied to users-db.json
- In clients.json, clientId abc123 is trustedClient=false (the default).

The .env file is used to override default settings. The default 
settings are sufficient for a simple demo, and a .env file is not required.
However, if you have created a .env file, the following should be configured
when running a demo on localhost 127.0.0.1 without TLS.

```
SERVER_TLS=false
SESSION_ENABLE_POSTGRES=false
DATABASE_ENABLE_POSTGRES=false
OAUTH2_EDITOR_SHOW_CLIENT_SECRET=true
DATABASE_DISABLE_WEB_ADMIN_PANEL=false
```

## Thunder Client Settings

- In Thunder Client: disable the functionality to follow redirects (302)

Settings > User > Extensions > Thunder Client > Follow Redirects (Uncheck)

## Import Environment and create Local Environment

A local environment is required to save authorization codes and access_tokens.
In the Thunder Client "Env" tab, if "(Local Env)" does not show in the list of environments. 
it must be created by selecting "Local Environment" in dropdown.

A set of testing credentials has been included in the repository.
Import the file: "thunderclient/thunder-environment_collab-auth-env.json".
This will import an environment named "collab-auth-env".
This includes the following environment variables for use in testing.

```
auth_host:       "http://127.0.0.1:3500"
frontend_host:   "http://localhost:3000"
backend_host:    "http://localhost:4000"
redirect_uri:    "http://localhost:3000/login/callback"
user_username:   "bob"
user_password:   "bobssecret"
client_id:       "abc123"
client_secret:   "ssh-secret"
client_base64:   "YWJjMTIzOnNzaC1zZWNyZXQ="
scopes:          "api.read api.write"
```

## Import collections from repository

To try the demo, import collection: "thunderclient/thunder-collection_collab-auth-demo.json" (Demonstration of OAuth2 handshake workflow)

Optional tests, import: "thunderclient/thunder-collection_collab-auth-tests.json" (Optional - Miscellaneous test used for debugging code)


## Rate limit issues

The authorization server includes a network rate limit middleware.
Exceeding the rate limit will generate status 429 Too Many Request 
errors. Restarting the collab-auth server will reset the limit.
It can be set to a higher value in the environment variables if needed.

# Running the OAuth 2.0 Demo

## Client Credentials Grant

Collection: collab-auth-demo

Folder: Client Credentials Grant

The client credentials grant is different from the other 3 grant 
types because user credentials are not required to obtain an access token.
This type of token is sometimes referred to as a machine token or device token.
These tokens may be used on machine devices that operate continuously. 
The use of a user login and password is impractical for security reasons, 
because each of multiple devices would need to store the user's password.
Oauth 2.0 allows machine devices operate under their own authority without a user. 
One example would be an IOT temperature sensor with a repeating timer that periodically submits 
a temperature value to a REST API database.

The request marked "1A" is a single stand alone request that will submit
the clientId and clientSecret to the authorization server. If the 
client account has sufficient permission, an access_token will be returned.
The access_token is captured and stored in Thunder Client variables 
for use in other tests.

The request marked "1B" will submit the access_token obtained in request 1A 
to the authorization server. The authorization server will lookup the 
token in the access_token database and return the meta-data associated with 
that token.

## Authorization Code Grant

Collection: collab-auth-demo

Folder: Authorization Code Grant

The OAuth2 Authorization Code Grant is typically used by web servers.
When an unauthorized user attempts to visit the web site, the user's
browser is redirected (302) to an independent authorization server.
The identity of the user is authenticated by entry of the user's password.
The browser is then directed back to the main web page with a random 
authorization code. The browser submits the code to the web server.
Internal to the web server, the code is re-submitted by the web server 
to the authorization server. If the code is valid, an access_token 
is returned to the web server. The access_token is stored in the web 
server session database, held on behalf of the user.
The user never takes possession of the access token.
In summary, the user has a cookie, the web server has the user's access token. 

The sequence in this folder demonstrates the functionality of the authorization server
as a stand alone activity. An additional folder "Combined collab-frontend"
includes a sequence that involves 2 servers, a web server and an auth server,
running the same workflow (see below).

Demonstrating the authorization code workflow with an API testing tool 
can be difficult because the authorization check at URL /dialog/authorize 
can behave differently depending on 4 different cases. These are combinations of 
and cookie: yes or no, and trusted client: yes or no.

The API test conditions are written for the case of an untrusted client 
`{ "trustedClient": false }` performing an new login. The browser 
would not have a cookie to the authorization server. In this configuration 
all collection tests should indicate a 'pass' result.

The other configurations can be demonstrated with authorization code grant 
by skipping various requests. In the case of skipped requests, 
the local variables will be correctly populated and a token produced.
However, many Thunder Client tests may show an error when trusted 
client is set to true or there is a pre-existing cookie. In this case 
ignore the errors. The first section of the following table is 
the intended demonstration with default configuration. The 
following 3 tables include skipped steps.


| Untrusted Client without cookie    | Comments             |
| -----------------------------------|----------------------|
| 2A GET  /dialog/authorize          | Redirect to /login   |
| 2B GET  /login                     | Login form           |
| 2C POST /login                     | Submit password      |
| 2D GET  /dialog/authorize          | Show decision form   |
| 2E POST /dialog/authorize/decision | Auth Code to Browser |
| 2F POST /oauth/token               | (submit by Browser)  |


| Trusted Client without cookie      | Comments             |
| -----------------------------------|----------------------|
| 2A GET  /dialog/authorize          | Redirect to /login   |
| 2B GET  /login                     | Login form           |
| 2C POST /login                     | Submit password      |
| 2D GET  /dialog/authorize          | Auth Code to Browser |
| 2E        (skip)                   |        - - -         |
| 2F POST /oauth/token               | (submit by Browser)  |


| Untrusted Client with cookie       | Comments             |
| -----------------------------------|----------------------|
| 2A GET  /dialog/authorize          | Show decision Form   |
| 2B        (skip)                   |        - - -         |
| 2C        (skip)                   |        - - -         |
| 2D        (skip)                   |        - - -         |
| 2E POST /dialog/authorize/decision | Auth code to Browser |
| 2F POST /oauth/token               | (submit by Browser)  |


| Trusted Client with cookie         | Comments             |
| -----------------------------------|----------------------|
| 2A GET  /dialog/authorize          | Auth code to Browser |
| 2B        (skip)                   |        - - -         |
| 2C        (skip)                   |        - - -         |
| 2D        (skip)                   |        - - -         |
| 2E        (skip)                   |        - - -         |
| 2F POST /oauth/token               | (submit by Browser)  |

The following flowchart may clarify the behavior of the /dialog/authorize route.

```
    / Browser \
   | Redirect  |
    \         /    
        |
        | -------------------------- < -----------------------------
        |/                                                          \
        |                                                            |
        |                                                           YES
                                                                     |
    /   Is   \                  / Get  \       / Submit \        /        \
   |  cookie  |  -- NO -- > -- |  Login | --> | Password |  --- | Correct? |
    \ valid? /                  \ Form /       \        /        \        /
        |                           |                                |
        |                            \                               NO
       YES                             -------------- < ------------/
        |
   /    Is    \                 /  Get   \       / User  \
  |   Client   | -- NO -- > -- | Decision | --> | Enters  | -- NO ---\
   \ Trusted? /                 \  Form  /       \ "Yes" /            |
        |                                            |            / Redirect \
        |                                           YES          |  Error to  |
        |                                            |            \ Browser  /
        | ----------------- < ----------------------/
        |/ 
        |
        |
   / Redirect \
  | With Auth  |
   \  Code    /

```

The recommended way to explore the authorization code grant collection is to 
single step the collection. At each step, look at the URL query parameters (GET)
or body parameters (POST) being submitted in the request. In the response, look at the 
HTTP status code, location header, and the response body.

This sequence includes demonstration of use of the refresh_token to obtain a 
replacement access_token. It also demonstrates token revocation.

## Implicit Grant

Collection: collab-auth-demo

Folder: Implicit Grant

Implicit Grant is no longer recommended for use. It was included here
as part of the learning project. Implicit grant may be disabled in 
the environment variables.

Implicit grant is intended to be used by stand alone applications
where the access_token is returned immediately without exchange 
of authorization codes. There are inherent risks when returning access tokens 
in an HTTP redirect without any confirmation that the credentials were actually 
received by the client. Therefore use of implicit grant has been deprecated.

While stepping through the sequence, initial redirect to the authorization 
server and user password entry is similar to the authorization code grant. 
Instead of returning an authorization code, the access_token is 
immediately returned as a URL query parameter in the 302 redirect.

## Password Grant

Collection: collab-auth-demo

Folder: Password Grant

Password Grant is no longer recommended for use. It was included here
as part of the learning project. Password grant may be disabled in 
the environment variables.

In password grant, the application collects security credentials 
and submits them directly to the authorization server. This is considered 
a security risk because the user's password and the clientSecret are 
retained in the end user's application.

The user's username, user's password, client's clientId, client's clientSecret, 
and scope are submitted. After authentication, an access_token is returned directly. 
There are no redirects involved in this exchange. The POST request marked "4A" 
is a single request with username and password in the body, and clientId and 
clientSecret credentials base64 encoded in an Authorization header using Basic auth.

Password grant is disabled in most OAuth2 implementation due to security risks.

## Integrated collab-auth, collab-frontend, collab-backend-api

Collection: collab-auth-demo

Folder: Combined collab-frontend

This sequence includes a full step by step emulation of a web server login using 
authorization code grant. The access_token is then used to make a database query. 
For this sequence to run properly, 3 different servers 
must be running in the test environment. Full instructions are available in the 
repository /docs folder.

For the cookies to work properly, the authorization server must be a different domain name
from the web server. The authorization server uses "127.0.0.1" and the web server uses "localhost".

```
collab-auth        http://127.0.0.1:3500
collab-frontend    http://localhost:3000
collab-backend-api http://localhost:4000
```
The requests prefaced with "Web" are submitted to the web server.

The requests prefaced with "Auth" are submitted to the authentication server.

- Web-1 The user attempts to visit the website main web page without a valid cookie. The browser is redirected to an /unauthorized landing page with a 'Login' button.
- Web-2 While on the landing page, the user can select a Login button that is a hyperlink to the /login route on the frontend web server.
- Web-3 The frontend web server receives the /login route and redirects (302) to the authorization server /dialog/authorize endpoint with several URL query parameters used for the OAuth2 handshake process.
- Auth-1 The authorization server saves the query parameters for later use. The request does not find a valid cookie. The browser is redirected (302) to the /login route on the authorization server.
- Auth-2 The authorization server returns the HTML login form for username and password entry (GET /login).
- Auth-3 The login form submission request submits the username and password to authenticate the user's identity (POST /login). If password is correct, a 302 redirect is sent returning the browser to the /dialog/authorize route.
- Auth-4 The client account has been configured trustedClient=false for this demonstration. This causes the /dialog/authorize route to return an HTML form asking user permission to access the resource.
- Auth-5 The decision form submission request submits a 'yes' response to the /dialog/authorize/decision route which returns a redirect (302) back to the original web server with an access code as a URL query parameter of the redirect URL in the location header.
- Web-4 The web browser receives the redirect and submits the authorization code to the web server and waits for a response. The web server submits the authorization code to the authorization server. If the code matches, a new access_token is created and returned to the web server. The access token is stored in the web server session database. The web server returns a redirect (302) with a valid cookie to the web browser to load the main web page.
- Web-5 The main web page loads, the page includes javascript that runs on page load.
- Web-6 As the main page loads, javascript sends a request to the /userinfo route on the web server. The name of the logged in user is returned for display in the banner at the top of the page indicating the login user.
- Web-6 This is a REST API database request 
  - Web server verifies the user's cookie.
  - Web server retrieves user's access token and adds it to the request.
  - The '/api/' is removed from the route and the request is forwarded by a reverse proxy to the backend database server at http://localhost:4000/v1/data/iot-data.
  - The backend API extracts the access token.
  - The access token is sent to the authorization server for validation.
  - The token's meta-data is returned from the authorization server to the backend database server.
  - The backend database checks the access_token meta-data scope value to see if the user has permission to access the resource. (api.read or api.write).
  - The database query is performed.
  - The backend API returns request to the web server.
  - The web server returns the request to the web browser.

# API Tests

## collab-auth-tests (Optional)

The 'collab-auth-tests' collection contains several folders with miscellaneous tests. 
It is not necessary to load this collection in order to see a step-by-step demonstration
of the OAuth workflow.

These are miscellaneous tests used during writing and debugging the program.
These API tests were never intended to be a comprehensive security test. 
The tests are limited to quick check of the server functionality.
This is mainly intended to see of dependency upgrades introduce any breaking changes.
