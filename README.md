Splash
======

Splash is a Tumblr web client. It aims to be secure and readable, and uses
no JavaScript. It connects to `api.tumblr.com` over HTTPS, avoiding DNS leakage.


Installation
------------

- Clone the repo:

    ```shellsession
    ~$ git clone https://github.com/charmander/splash
    ~$ cd splash
    ```

- Install dependencies:

    ```shellsession
    ~/splash$ npm install
    ```

- Install the included [Bree Serif Regular](fonts/bree-serif) (optional)

- Start the server:

    ```shellsession
    ~/splash$ PORT=3000 node splash
    ```

- Add a hosts entry for `::1 splash`:

    ```shellsession
    ~/splash$ echo '::1 splash' | sudo tee -a /etc/hosts
    ```

- Visit <http://splash:3000/blog/staff/>!


TODO
----

 - Private posts (the v2 API doesn’t seem to support these, but there are a few
   ways around that)
