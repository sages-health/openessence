    ___________
    \_   _____/______ _____    ____ _____    ______
     |    __/ \_  __ \\__  \ /  ___\\__  \  /  ___/
     |   |     |  | \/ / __ \\  \___ / __ \_\___ \
     |_ _|     |__|   /______/\_____/______/______|

A front-end for disease surveillance  

## Name

The name __Fracas__ is inspired by
 [Girolamo Fracastoro](http://en.wikipedia.org/wiki/Girolamo_Fracastoro), a
 15<sup>th</sup>-century Italian physician important in the
 [history of epidemiology](http://en.wikipedia.org/wiki/Epidemiology#History).

If you really need __Fracas__ to be an acronym, it can stand for <strong>FR</strong>ont-end for
 the <strong>A</strong>nalysis and <strong>C</strong>ontrol of Outbre<strong>A</strong>k<strong>S</strong>.

## Requirements

 * [NodeJS](http://nodejs.org)
 * [Elasticsearch](http://elasticsearch.org), which depends on Java
 * [Redis](http://redis.io)

## Building

To build Fracas, you first need to install [`gulp`](http://gulpjs.com) and [`bower`](http://bower.io) globally:

    npm install -g gulp bower

The quickest way to get started is to then run

    npm start

This will install all necessary dependencies, run a build, start the server, and launch Fracas in your web browser.

## Installation

If you've already got [Docker](https://www.docker.com) and [Fig](http://www.fig.sh) then getting Fracas running is as
easy as

    fig up

If you're using [`boot2docker`](http://boot2docker.io), you may have to pass the URL you plan to hit Fracas at:

    URL=http://192.168.59.103:9000 fig up

We also plan on providing pre-built VMs if Docker's not your thing. Using these VMs is recommended in production if
you're not comfortable managing Docker containers.
