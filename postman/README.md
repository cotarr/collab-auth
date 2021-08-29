# Instruction to use postman

- Import this collection from repository
- Import development environment variables (edit as necessary)

## Local variables

For development, these can be imported from `collab-auth.postman_environment.json`

Note: auth_host must be different domain from frontend and backend

- auth_host      (http://127.0.0.1:3500)
- frontend_host  (http://localhost:3000)
- backend_host   (http://localhost:4000)
- redirect_uri   (http://localhost:3000/login/callback)
- user_username  (bob)
- user_password  (secret)
- client_id      (abc123)
- client_secret  (ssh-secret)
- client_base64  (YWJjMTIzOnNzaC1zZWNyZXQ=)
- scopes         (offline_access auth.token api.read)

## collection: "colab-auth (code grant)"

The use of this depends on the client properties.
Clients with property trustedClient=true will
include a second dialog to allow the login user to
approve the specific resource. If trusted client is false,
then the user will only see the user/password dialog.

Additionally, if the user's browser already has a valid cookie
to the authorization server, from previous login dialog,
then the password entry steps are skipped. Step (2)
simply presents the login for in HTML without function,
and (2) the login form can always be skipped.

- No cookie, Untrusted Client (1)-(3)-(4)-(5)-(6)
- No cookie, Trusted Client (1)-(3)-(4)-(6) skipped step (5)
- Cookie, Untrusted Client (1)-(5)-(6)
- Cookie, Trusted Client (1)-(6) skipped step (5)

## collection: "colab-auth (client grant)"

This collection is to get an access-token using client-id and client-secret

## collection: "colab-auth (password grant)"

This collection is to get an access-token using
client-id and client-secret, username and user password.

## collection: "colab-auth (implicit grant)"

This is similar to code grant, but returns token directly instead of authorizaton code.

## Collection: "collab-auth (misc calls)"

This collection is various single route debug tests.
This in not a test suite. Do to run it in order.

## Collection: "collab-auth (session auth)"

Used to check cookie on auth server web access.


## Notes

When initiating request in (1) and (4) /dialog/authorize,
the setting for "scope=offline_access" will tell
the auth server to add a refresh token.
