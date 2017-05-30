# OpenESSENCE

* [Building](#building)
* [Windows Users](#windows-users)
* [Docker Elastic Search and Redis Setup](#docker-elasticsearch-and-redis-setup)
* [Initializing Elasticsearch with data](#initializing-elasticsearch-with-data)
* [Running OpenESSENCE](#running-openessence)
* [Map Setup](#map-setup)

## Requirements

These requirements are only needed where you will be running Node. If you are going to be developing side a VM, you can jump down to the Vagrant portion. 
If developing locally, you'll want to make sure the below pre-requisites are present.

Development
 * [Node.js 4.8.3](http://nodejs.org), [nvm](https://github.com/creationix/nvm) recommended for installing this version
 * [Elasticsearch 2.4](https://www.elastic.co/) - Required

 * [Docker](https://www.docker.com/) - OPTIONAL
 * [Vagrant](https://www.vagrantup.com/) - OPTIONAL, unless using to run Docker in a VM
 * [Redis](https://github.com/MSOpenTech/redis/releases) - OPTIONAL, needed for persistent sessions between restarts
 * [Docker Compose](https://docs.docker.com/compose/install/) - OPTIONAL
 * [Python 2.7](https://www.python.org/download/releases/2.7/) - OPTIONAL, needed for Docker-Compose

## Building

To build OpenESSENCE, you first need to install Node.js 4.8.3, [`gulp`](http://gulpjs.com), and [`bower`](http://bower.io) globally:

    npm install -g gulp bower@1.7.9

> Bower 1.7.9 is used to avoid an issue where it will randomly fail (https://github.com/travis-ci/travis-ci/issues/6014)

The quickest way to get started is to then run

    npm install
    bower install

This will install all necessary dependencies, run a build, start the server, and launch OpenESSENCE in your web browser. Default credentials are admin/admin.

If the `bower install` fails due to a file being locked, try the following commands. This is not a mandatory step.

    bower cache clean
    bower install --force
    bower prune

Run `gulp build` at least once. You can run gulp server to re-build script everytime, or you can simply run `node server.js` (after seeing Elasticsearch) to quickly start the server and 
still have auto-refresh on HTML, javascript, and css changes.

Copy [config/settings.default.js](config/settings.default.js) to [config/settings.js](config/settings.js). You'll be able to modify any node settings through here. 

### Windows Users

Unless you decide to install [Docker Toolbox for Windows](https://docs.docker.com/toolbox/toolbox_install_windows/) (Windows 7) or Docker for Windows (Windows 10), you'll need to either 

1.) Install Elasticsearch for Windows. Redis isn't natively supported on Windows, but you can utilize Node's in-memory session storage to avoid having to use it. If you want to use Redis (after getting it installed in some way), just un-comment out the following line in the settings.js

    //settings.session.store = 'redis'

or

2.) Run the following vagrant command to bring up Elasticsearch and Redis in Docker inside the VM. Sometimes this is a cleaner option. You'll then want to go to [Initializing Elasticsearch with data](#initializing-elasticsearch-with-data)

    vagrant up windows_development

If you choose to install Docker for Windows, you'll need to run the docker commands in the [Docker Elastic Search and Redis Setup](#docker-elasticsearch-and-redis-setup) section


## Docker Elasticsearch and Redis Setup

> This is only needed if you are using Docker natively and not running the Vagrant target in the [Windows Users](#windows-users) section

Make sure your Docker service is up (usually systemctl start docker) and run the following commands to start Elasticsearch

    sudo docker run -d -p 9200:9200 -p 9300:9300 --restart=always -v "$PWD/data":/usr/share/elasticsearch/data -v "$PWD/elasticsearch/config/elasticsearch.yml":/usr/share/elasticsearch/config/elasticsearch.yml --privileged --name elasticsearch elasticsearch:2.4-alpine
    sudo docker run -d -p 6379:6379 --restart=always --name redis redis:alpine

If you need the delete-by-query functionality then run the following command to install the ES plugin

    sudo docker exec -it elasticsearch bin/plugin install delete-by-query


## Running OpenESSENCE

After you've installed Node, built OpenESSENCE, setup Elasticsearch (and optionally Redis) you can start OpenESSENCE with the following command

    node server.js

## Initializing Elasticsearch with data

If you are developing locally with a fresh Elasticsearch instance or Docker container, use the following command to initialize ES with default data

    node server/migrations/reseed

When you update a .json file in the server/migrations directory, or you pull a change to a .json file in server/migrations, you'll want to clean and reseed the database using the following commands

    node server/migrations/clean
    node server/migrations/reseed


## Map Setup

> This is a completely OPTIONAL step

By default we do not use a background map layer. However, we do use [Leaflet](http://leafletjs.com/) for our mapping. If you want to set up a proper GIS base layer, use the 
[following guide from OpenMapTiles](https://openmaptiles.org/docs/) to set up the tile server. 

The quickest way to set up the tileserver is by running 

    sudo docker run -d -p 8080:80 klokantech/tileserver-gl

You can then edit the settings.js file to center on the correct lat/lon and set the tile server URL. (below are the defaults for the example data)

    settings.MAP_URL = "'http://localhost:8080/styles/klokantech-basic/rendered/{z}/{x}/{y}.png'"
    settings.MAP_LATITUDE = '41.4925'
    settings.MAP_LONGITUDE = '-99.9018'
