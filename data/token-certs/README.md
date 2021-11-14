# Instructions to make token signing RSA keys

Openssl is used as a command line tool to generate a pair of files containing the RSA keys.
The RSA private key is used add a digital signature to a new token using the "RS256" algoithm.
The RSA public key is used to verify the signature whe then token is decoded.
Although the "certifiacte.pem" file is a standard self signed SSL/TLS web certificate,
only the RSA Public-Key within the certificate appears to be relevant.
The certificate attributes for "Validity Not After:..." and "Subject: CN..."
appear to be ignored. The presence of an expired TLS certificate expiration date
does not appear to generate any errors when decoding the JWT token.
Therefore, these files can be considered as non-expiring credentials and 
the certificate validity dates, which default to 30 days, are ignored.

In the case of this program, each JWT token will have it's own unique expiration 
within the digitally signed token payload, so ignoring the alternate 
certificate date this does not appear to an issue.         

The following commands can be used to generate the RSA keys.

```bash
cd data/token-certs/
openssl req -newkey rsa:2048 -nodes -keyout privatekey.pem -x509 -out certificate.pem -subj "/CN=collab-auth"
cd ../..
```

* Token certificates are located in data/token-certs/
* The .gitignore should include  data/token-certs/*.pem