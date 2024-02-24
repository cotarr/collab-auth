# TLS certificates folder

Your web browser may require TLS certificates for testing/
This folder was created as a place to hold temporary TLS certificate files during testing. 
To reduce security risks, it is recommended that the private key not be publicly readable.

The default certificate location points to "certificate.pem" and "privatekey.pem" located in this folder.
If you generate the files as shown below, there is no need to configure a file location.
An alternate TLS certificate location can be specified in the environment variables.

```
SERVER_TLS_KEY=
SERVER_TLS_CERT=
```

TLS is enabled by setting environment variable SERVER_TLS=true.

```
SERVER_TLS=true
```

The following bash commands should generate a temporary self signed certificate with proper filenames.
The openssl program will prompt you with a series of questions. 
If you are in a testing environment, you may omit the default values by entering a period [.].
For testing, the only required value would be the Common Name CN, which you could use a factitious domain name.
During testing, your web browser will reject the self signed TLS certificate as in error, but the web browser should
allow an override option to temporarily use the self signed certificate and ignore the security hostname verification.

These bash commands:

```bash
openssl genrsa -out privatekey.pem 2048
openssl req -new -key privatekey.pem -out certrequest.csr 
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem

rm certrequest.csr
```

Should produce these files.

```
certificate.pem
privatekey.pem
```

* TLS certificates are located in data/tls-certs/
* The .gitignore should include data/tls-certs/*.pem

Note: the program uses two independent sets of certificates, 
one set for web server TLS encryption, 
the other set for Oauth 2.0 access token signatures.