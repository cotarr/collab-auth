/* It is assumed user is familiar with execution of PostgreSQL scripts using psql */

/* --------------------------------------------------------------------------------- */
/* The "session" table is for npm package: connect-pg-simple used by express-session */
/* This is copied from node_modules/connect-pg-simple/table.sql                      */
/* --------------------------------------------------------------------------------- */
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
