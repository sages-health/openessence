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

 * [Node.js](http://nodejs.org)
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

If you don't like fig, we also support [Vagrant](https://www.vagrantup.com). Just run

    vagrant up

to get started. This can be useful if you want a self-contained VM.

## Deploying to Heroku

Just click this button:

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/gabegorelick/fracas)

Feel free to tweak any of the environment variables, although the defaults should mostly be fine. One setting you do
 need to set though is `URL`, which should be set to whatever URL clients will use to connect to your site. If you're
 not using your own domain, then this will be `https://yourappname.herokuapp.com`.

## Deploying to other PaaS providers

Since we support running Fracas in a Docker container, we support any PaaS provider that supports Docker. This includes:

 * [AWS Elastic Beanstalk](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker_eb.html)
 * [Google Compute Engine](https://developers.google.com/compute/docs/containers)
 * [Microsoft Azure](http://azure.microsoft.com/blog/2014/06/09/docker-and-azure-coolness)

just to name a few. Additionally, any IaaS or VPS that supports new-ish versions of Linux can run Docker, and thus
 should run Fracas fine. This includes:

 * [Digital Ocean](https://www.digitalocean.com/community/tutorials/how-to-use-the-digitalocean-docker-application)
 * [Linode](https://www.linode.com/docs/applications/containers/docker)
 * [Amazon EC2](https://docs.docker.com/installation/amazon)
 * [Rackspace Cloud](https://docs.docker.com/installation/rackspace)
 * [SoftLayer](https://docs.docker.com/installation/softlayer)

...and many more.
