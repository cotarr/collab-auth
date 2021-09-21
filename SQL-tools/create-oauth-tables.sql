/* It is assumed user is familiar with execution of PostgreSQL scripts using psql */

/* ------------------------------------------------------------------- */
/* Table hold oauth2 access token meta-data (jti in UUID.v4 format)    */
/* The actual JWT tokens are not stored.                               */
/* The Column "userID" is optional and not applicable to client tokens */
/* ------------------------------------------------------------------- */
CREATE TABLE accesstokens (
  "id" uuid PRIMARY KEY NOT NULL,
  "userID" uuid,
  "clientID" uuid NOT NULL,
  "expirationDate" timestamp without time zone NOT NULL,
  "scope" varchar(64)[],
  "grantType" varchar(64),
  "authTime" timestamp without time zone
);

/* ------------------------------------------------------------------- */
/* Table hold oauth2 refresh token meta-data (jti in UUID.v4 format)   */
/* The actual JWT tokens are not stored.                               */
/* The Column "userID" is optional and not applicable to client tokens */
/* ------------------------------------------------------------------- */
CREATE TABLE refreshtokens (
  "id" uuid PRIMARY KEY NOT NULL,
  "userID" uuid,
  "clientID" uuid NOT NULL,
  "expirationDate" timestamp without time zone NOT NULL,
  "scope" varchar(64)[],
  "grantType" varchar(64),
  "authTime" timestamp without time zone
);

/* ------------------------------------------------------------------------ */
/* Client Account Records                                                   */
/* The "clientTokenKey" is only applicable to grant type:                   */
/*    client credentials.                                                   */
/* The "allowedRedirectURI" column is only applicable to grant types:       */
/*    code grant and token grant (implicit grant).                          */
/* The "id", "createdAt", and "updatedAt" columns are auto-generated        */
/* ------------------------------------------------------------------------ */
/* Future: "clientTokenKey" varchar(128), */
CREATE TABLE authclients (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  "name" varchar(128) NOT NULL,
  "clientId" varchar(128) NOT NULL,
  "clientSecret" varchar(128) NOT NULL,
  "trustedClient" boolean NOT NULL,
  "allowedScope" varchar(64)[] NOT NULL,
  "allowedRedirectURI" varchar(255)[],
  "deleted" boolean NOT NULL DEFAULT FALSE,
  "createdAt" timestamp without time zone NOT NULL,
  "updatedAt" timestamp without time zone NOT NULL
);

/* ------------------------------------------------------------------------ */
/* User Account Records                                                   */
/* The "id", "createdAt", and "updatedAt" columns are auto-generated        */
/* ------------------------------------------------------------------------ */
CREATE TABLE authusers (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  "number" integer NOT NULL,
  "username" varchar(128) NOT NULL,
  "password" varchar(128) NOT NULL,
  "name" varchar(128) NOT NULL,
  "loginDisabled" boolean NOT NULL DEFAULT FALSE,
  "role" varchar(64)[] NOT NULL,
  "deleted" boolean NOT NULL DEFAULT FALSE,
  "lastLogin" timestamp without time zone,
  "createdAt" timestamp without time zone NOT NULL,
  "updatedAt" timestamp without time zone NOT NULL
);
