###############################################################################
# Dockerfile for Fracas. Inspired by https://github.com/docker-library/node.
###############################################################################

FROM node:0.10 

MAINTAINER Gabe Gorelick, "https://github.com/sages-health"


RUN mkdir /code
WORKDIR /code

# Some of this stuff is only needed for building, so we remove it when we're done
ADD po /code/po
ADD public /code/public
ADD server /code/server
ADD tasks /code/tasks
ADD views /code/views
ADD bower.json /code/bower.json
ADD gulpfile.js /code/gulpfile.js
ADD package.json /code/package.json
ADD server.js /code/server.js
ADD config /code/config

# Hopefully once Docker-in-Docker becomes easier we can build the app in a separate container and not have to
# worry about all the extra setup and tear down building inside the container entails

RUN buildDeps='autoconf build-essential ca-certificates curl git libjpeg-dev libpng-dev pkg-config python'; \
    phantomDeps='libfreetype6 libfontconfig1'; \
    set -x; \
    apt-get update && apt-get install -y $buildDeps $phantomDeps --no-install-recommends \
    && npm update -g npm \
    && npm install -g gulp bower \
    && npm install \
    && bower install --allow-root \
    && bower cache clean --allow-root \
    && gulp build \
    && npm prune --production \
    && npm uninstall -g gulp bower \
    && npm cache clear \
    && apt-get purge -y $buildDeps \
    && apt-get autoremove -y \
    && rm -rf /code/bower_components \
    && rm -rf /code/po \
    && rm -rf /code/public \
    && rm -rf /code/tasks \
    && rm -rf /code/views \
    && rm -f /code/bower.json \
    && rm -f /code/gulpfile.js


EXPOSE 9000 9001
ENV NODE_ENV production


CMD ["node", "/code/server.js"]
