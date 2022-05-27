Splash
======

Splash is a Tumblr web client. It aims to be secure and readable, and uses
no JavaScript. It connects to `api.tumblr.com` over HTTPS, keeping the names of
Tumblr blogs being browsed out of DNS queries and SNI.


Installation
------------

Requires [Node][] 14 or later.

- Clone the repo:

    ```shellsession
    [user@host ~] $ git clone https://github.com/charmander/splash
    [user@host ~] $ cd splash
    ```

- Install dependencies:

    ```shellsession
    [user@host ~/splash] $ npm install
    ```

- Install the included [Bree Serif Regular](fonts/bree-serif) (optional)

- Start the server:

    ```shellsession
    [user@host ~/splash] $ PORT=3000 node splash
    ```

- Add a hosts entry for `::1 splash`:

    ```shellsession
    [user@host ~/splash] $ echo '::1 splash' | sudo tee -a /etc/hosts
    ```

- Visit <http://splash:3000/blog/staff/>!


TODO
----

 - Private posts (the v2 API doesn’t seem to support these, but there are a few
   ways around that)


[Node]: https://nodejs.org/
