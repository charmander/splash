Splash
======

Splash is a Tumblr web client. It aims to be secure and readable, and uses
no JavaScript. It connects to `api.tumblr.com` over HTTPS, avoiding DNS leakage.


Installation
------------

```shellsession
~$ git clone https://github.com/charmander/splash
~$ cd splash
~/splash$ npm install --no-save
~/splash$ node splash
```

You will need some kind of reverse proxy – [Nginx][], for example.
It should serve static files from splash’s `public/` directory and proxy from
`/tmp/splash.sock`.

Add a hosts entry for `::1 splash`, and visit
<http://splash/blog/staff/>.


TODO
----

 - Private posts (the v2 API doesn’t seem to support these, but there are a few
   ways around that)


  [Nginx]: https://nginx.org/
