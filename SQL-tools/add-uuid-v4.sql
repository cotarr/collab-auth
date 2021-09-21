/* ---------------------------------------------- */
/* The extension UUID must be added to database.  */
/* You can see if UUID is already supported by:   */
/* ---------------------------------------------- */

SELECT uuid_generate_v4();

/* ---------------------------------------------- */
/* It must be added by superuser.                 */
/* Bash commands, assuming database: collabauth   */
/*      sudo su postgres                          */
/*      psql collabauth postgres                  */
/* ---------------------------------------------- */
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4();
