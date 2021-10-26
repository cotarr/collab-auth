# TODO: Make your own certificates

* Token certificates are located in data/token-certs/
* The .gitignore should include  data/token-certs/*.pem

Note: For development and testing purposes, these certificates can also be used
as a self signed TLS certificates for HTTP requests. 
The file path to this location is the default server TLS certificate filename.

* Openssl is used to generate the certificates
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

```bash
openssl genrsa -out privatekey.pem 2048
openssl req -new -key privatekey.pem -out certrequest.csr
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
rm -v certrequest.csr
```
