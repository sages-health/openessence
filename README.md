# OpenESSENCE

## Requirements

 * [Node.js](http://nodejs.org)
 * [Elasticsearch](http://elasticsearch.org), which depends on Java
 * [Redis](http://redis.io)

## Vagrant

After installing [Vagrant](https://www.vagrantup.com) and [VirtualBox](https://www.virtualbox.org/) (or any other
virtualization platform that Vagrant supports), just run

    vagrant up

to get started. 

### Windows Users

Unless you have rsync configured for your environment, you'll want to checkout out and build the code in a new folder inside of the VM instead 
of using the /vagrant synced folder due to issues npm sometimes has with writing node_modules out to Windows paths. If you develop in the VM, make sure 
to update your git configurations appropriately. 

## Elasticsearch and Redis Setup

Make sure your Docker service is up and run the following commands to start Elasticsearch where {DIR} is your specified directory on the host

    sudo docker run -d -p 9200:9200 -p 9300:9300 --restart=always -v {DIR}/data:/usr/share/elasticsearch/data --privileged --name elasticsearch elasticsearch:2.4 
    sudo docker run -d -p 6379:6379 --restart=always  redis:alpine

## Initializing Elasticsearch with data

If you are running your own Elasticsearch instance or you launched a Docker instance, use the following command to initialize ES with default data

    node server/migrations/reseed

## Building

To build OpenESSENCE, you first need to install [`gulp`](http://gulpjs.com) and [`bower`](http://bower.io) globally:

    npm install -g gulp bower

The quickest way to get started is to then run

    npm start

This will install all necessary dependencies, run a build, start the server, and launch OpenESSENCE in your web browser. Default credentials are admin/admin.

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
