# TODO: Make your own certificates


- The .gitignore should include certs/*.pem

Note certificates are also used to sign/verify JWT tokens

* Entry of period [.] will skip an input
* For testing, the following were used
 * Organization Name = collab-auth
 * Common Name = collab-auth


```bash
openssl genrsa -out privatekey.pem 2048
openssl req -new -key privatekey.pem -out certrequest.csr
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
rm -v certrequest.csr
```
