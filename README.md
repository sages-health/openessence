# OpenESSENCE

## Requirements

 * [Node.js](http://nodejs.org)
 * [Elasticsearch](http://elasticsearch.org), which depends on Java
 * [Redis](http://redis.io)

## Building

To build OpenESSENCE, you first need to install [`gulp`](http://gulpjs.com) and [`bower`](http://bower.io) globally:

    npm install -g gulp bower

The quickest way to get started is to then run

    npm start

This will install all necessary dependencies, run a build, start the server, and launch OpenESSENCE in your web browser.

## Installation

After installing [Vagrant](https://www.vagrantup.com) and [VirtualBox](https://www.virtualbox.org/) (or any other
virtualization platform that Vagrant supports), just run

    vagrant up

to get started.

## Deploying to Heroku

Just click this button:

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/gabegorelick/fracas)

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
