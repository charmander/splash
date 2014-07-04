Splash is a Tumblr web client. It aims to be secure and readable, and uses
no JavaScript. It connects to `api.tumblr.com` over HTTPS, avoiding DNS leakage.

[Node] is required, and [Nginx] is recommended.

## Installation

```
~ $ git clone https://github.com/charmander/splash
~ $ cd splash/sample/
sample $ make
sample $ sudo make install NGINX_CONF_DIR=/usr/local/nginx/conf/
sample $ cd ../
splash $ npm install --production
splash $ node splash
```

Import the CA certificate at `splash/sample/ca.crt`, add a hosts entry
for `::1 splash`, and visit <https://splash/blog/staff.tumblr.com>.

## TODO

 - `/tagged/`

 - Private posts (the v2 API doesn’t seem to support these, but there are a few
   ways around that)


  [Node]: http://nodejs.org/
  [Nginx]: http://nginx.org/
