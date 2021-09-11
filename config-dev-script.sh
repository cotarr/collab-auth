#!/bin/bash
#

echo "Running development environment configuration script..."

#
# Make sure template files exist, thus also running from correct folder.
#
if [ ! -f "example-clients-db.json" ] ; then
  echo "Unable to fund example-clients-db.json"
  echo "This should be run from the base folder of the git repository"
  exit 1
fi

if [ ! -f "example-users-db.json" ] ; then
  echo "Unable to fund example-users-db.json"
  echo "This should be run from the base folder of the git repository"
  exit 1
fi

if [ ! -f "clients-db.json" ] ; then
  echo "Copying example client file"
  cp -v example-clients-db.json clients-db.json
  chmod 600 clients-db.json
else
  echo "clients-db.json exists, skipping..."
fi

if [ ! -f "users-db.json" ] ; then
  echo "Copying example user file"
  cp -v example-users-db.json users-db.json
  chmod 600 clients-db.json
else
  echo "users-db.json exists, skipping..."
fi

if [ ! -f "./server/certs/privatekey.pem" ] && [ ! -f "./server/certs/certificate.pem" ]; then
  echo "Creating private key"
  openssl genrsa -out ./server/certs/privatekey.pem 2048
  echo "Creating certificate"
  echo
  echo "------------------------------------------------"
  echo "              R E A D   M E"
  echo "    For testing, the following were used"
  echo "        Organization Name = collab-auth"
  echo "        Common Name = collab-auth"
  echo "    Other entries may be skipped"
  echo "    Entry of period [.] will skip an input"
  echo "------------------------------------------------"
  openssl req -new -key ./server/certs/privatekey.pem -out ./server/certs/certrequest.csr
  openssl x509 -req -in ./server/certs/certrequest.csr -signkey ./server/certs/privatekey.pem -out ./server/certs/certificate.pem
  rm -v ./server/certs/certrequest.csr
else
  echo "Certificates exist, skipping..."
fi
echo "Done."
