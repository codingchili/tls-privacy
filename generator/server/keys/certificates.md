# Certificate management

### Creating certificates for a local server

Generate a certificate by editing request.ext and configuring the DNS names, then run

```bash
./mkcert
```

This will generate a server.key and a server.pem file and will be used by the server without additional configuration. 

### Retrieve certificate using the browser

Use a browser to export the certificate and then import it into the OS truststore.

### Retrieve certificate from running server

Retrieve PEM encoded certificate from a running server.

```bash
openssl s_client -showcerts -connect host:port 2>/dev/null | openssl x509 >> certificate.pem
```
### Puppeteer: trust self-signed certificates

On unix, import a PEM encoded certificate into the nssdb used by puppeteer.

```bash
certutil -A -n "cert-name" -d sql:$HOME/.pki/nssdb -t C,, -a -i certificate.pem
```

On Windows certificates are installed in the OS truststore.

### Puppeteer: self-signed certificates without trust

In generator/browser/browser.js set `ignoreHTTPSErrors` to `true`. Note that this will lead
to a slightly different behavior than providing trust - as the browser will still consider
the connection insecure in regards to caching.