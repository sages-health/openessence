# OpenESSENCE

* [Vagrant](#vagrant)
* [Windows Users](#windows-users)
* [Docker Compose Quick Start](#quick-start-docker-compose)
* [Elastic Search and Redis Setup](#elasticsearch-and-redis-setup)
* [Initializing Elasticsearch with data](#initializing-elasticsearch-with-data)
* [Building](#building)
* [Map Setup](#map-setup)
* [OpenESSENCE Docker Container](#openessence-docker-container)
* [Deploying to Heroku](#deploying-to-heroku)
* [Deploying to other PaaS providers](#deploying-to-other-paas-providers)


## Requirements

These requirements are only needed where you will be running Node. If you are going to be developing side a VM, you can jump down to the Vagrant portion. 
If developing locally, you'll want to make sure the below pre-requisites are present.

Production

 * [Docker](https://www.docker.com/) - included in Vagrantfile
 * [Docker Compose](https://docs.docker.com/compose/install/) - included in Vagrantfile

Development
 * [Node.js 0.10.38](http://nodejs.org), [nvm](https://github.com/creationix/nvm) recommended for installing this version - included in Vagrant 
 * [Docker](https://www.docker.com/) - included in Vagrant
 * [Docker Compose](https://docs.docker.com/compose/install/) - included in Vagrantfile
 * [Python 2.7](https://www.python.org/download/releases/2.7/) - included in Vagrantfile

## Vagrant

After installing [Vagrant](https://www.vagrantup.com) and [VirtualBox](https://www.virtualbox.org/) (or any other
virtualization platform that Vagrant supports), just run

    vagrant up

to get started. Once it finishes, you can access the VM GUI through the Oracle VM Virtualbox Manager or via vagrant ssh.

You'll want to clone the repository to the directory of your choice with

    git clone https://r1l-gitlab/sages/openessence.git

You made need to run the following instead if you get SSL errors with r1l-gitlab

    env GIT_SSL_NO_VERIFY=true git clone https://r1l-gitlab/sages/openessence.git

### Windows Users

Unless you have rsync configured for your environment, you'll want to checkout out and build the code in a new folder inside of the VM instead 
of using the /vagrant synced folder due to issues npm sometimes has with writing node_modules out to Windows paths. If you develop in the VM, make sure 
to update your git configurations appropriately. 

## Docker Compose Quick Start

If you want to get started with OpenESSENCE quickly, simply git clone and run

    docker-compose up
    docker exec openessence_openessence_1 node /code/server/migrations/reseed

This will create all the necessary OpenESSENCE VMs and initialize the database with the reseed command. You may want to copy 
the [config/settings.template.js](config/settings.template.js) file to config/settings.js to modify the default settings and secret key. 

If you want to develop, then just get Elasticsearch and Redis running with

    docker-compose up elasticsearch redis
    node server/migrations/reseed

## Individual Elasticsearch and Redis Setup

Make sure your Docker service is up and run the following commands to start Elasticsearch where {DIR} is your specified directory on the host

    sudo docker run -d -p 9200:9200 -p 9300:9300 --restart=always -v "$PWD/data":/usr/share/elasticsearch/data -v "$PWD/elasticsearch/config/elasticsearch.yml":/usr/share/elasticsearch/config/elasticsearch.yml --privileged --name elasticsearch elasticsearch:2.4
    sudo docker run -d -p 6379:6379 --restart=always  redis:alpine


## Initializing Elasticsearch with data

If you are developing locally with own Elasticsearch instance or you launched a container, use the following command to initialize ES with default data

    node server/migrations/reseed

If you need to initialize ES on a CoreOS instance, you can build a docker image to do that. Run these after you get OpenESSENCE, Elasticsearch, and Redis containers running

    sudo docker build -t oe_init-db -f vagrant/Dockerfile.init_db .
    sudo docker run oe_init-db

## Building

To build OpenESSENCE, you first need to install [`gulp`](http://gulpjs.com) and [`bower`](http://bower.io) globally:

    npm install -g gulp bower

The quickest way to get started is to then run

    npm install
    bower install

This will install all necessary dependencies, run a build, start the server, and launch OpenESSENCE in your web browser. Default credentials are admin/admin.

If the bower install fails due to a file being locked, try the following commands

    bower cache clean
    bower install --force
    bower prune

Run gulp build at least once. You can run gulp server to re-build script everytime, or you can simply run node server.js to quickly start the server and 
still have auto-refresh on HTML,javascript, and css changes.


## Map Setup

THIS IS COMPLETELY OPTIONAL

By default we do not use a background map layer. However, we do use [Leaflet](http://leafletjs.com/) for our mapping. If you want to set up a proper GIS base layer, use the 
[following guide from OpenMapTiles](https://openmaptiles.org/docs/) to set up the tile server. 

The quickest way to set up the tileserver is by running 

    sudo docker run -d -p 8080:80 klokantech/tileserver-gl

You can then edit the settings.js file to center on the correct lat/lon and set the tile server URL. (below are the defaults for the example data)

    settings.MAP_URL = "'http://localhost:8080/styles/klokantech-basic/rendered/{z}/{x}/{y}.png'"
    settings.MAP_LATITUDE = '41.4925'
    settings.MAP_LONGITUDE = '-99.9018'

## OpenESSENCE Docker Container
If you want to get things up and running with just docker, you can start the web app with

    sudo docker run -d -p 9000:9000 --restart=always --link elasticsearch:elasticsearch --link redis:redis sageshealth/openessence

If you need to modify the settings.js for a specific host name, you can include it in the docker container by adding -v conf/settings.js:/code/config/settings.js .
The config file will get added automatically it you build the container image manually via

    sudo docker build -t sageshealth/openessence .

## Deploying to Heroku

Just click this button:

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/sages-health/openessence)

Feel free to tweak any of the environment variables, although the defaults should mostly be fine. One setting you do
 need to set though is `URL`, which should be set to whatever URL clients will use to connect to your site. If you're
 not using your own domain, then this will be `https://yourappname.herokuapp.com`.


## Deploying to other PaaS providers

Since we support running OpenESSENCE in a Docker container, we support any PaaS provider that supports Docker. This includes:

 * [AWS Elastic Beanstalk](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker_eb.html)
 * [Google Compute Engine](https://developers.google.com/compute/docs/containers)
 * [Microsoft Azure](http://azure.microsoft.com/blog/2014/06/09/docker-and-azure-coolness)

just to name a few. Additionally, any IaaS or VPS that supports new-ish versions of Linux can run Docker, and thus
 should run OpenESSENCE fine. This includes:

 * [Digital Ocean](https://www.digitalocean.com/community/tutorials/how-to-use-the-digitalocean-docker-application)
 * [Linode](https://www.linode.com/docs/applications/containers/docker)
 * [Amazon EC2](https://docs.docker.com/installation/amazon)
 * [Rackspace Cloud](https://docs.docker.com/installation/rackspace)
 * [SoftLayer](https://docs.docker.com/installation/softlayer)

...and many more.
