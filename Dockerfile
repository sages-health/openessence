###############################################################################
# Dockerfile for Fracas. Inspired by https://github.com/docker-library/node.
###############################################################################

FROM debian:jessie

MAINTAINER Gabe Gorelick, "https://github.com/gabegorelick"

ENV NODE_VERSION 0.10.32
ENV NPM_VERSION 2.1.4

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

# Hopefully once Docker-in-Docker becomes easier we can build the app in a separate container and not have to
# worry about all the extra setup and tear down building inside the container entails

RUN buildDeps='autoconf build-essential ca-certificates curl git libjpeg-dev libpng-dev pkg-config python'; \
    set -x; \
    apt-get update && apt-get install -y $buildDeps --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && gpg --keyserver pgp.mit.edu --recv-keys 7937DFD2AB06298B2293C3187D33FF9D0246406D \
    && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" \
    && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --verify SHASUMS256.txt.asc \
    && grep " node-v$NODE_VERSION-linux-x64.tar.gz\$" SHASUMS256.txt.asc | sha256sum -c - \
    && tar -xzf "node-v$NODE_VERSION-linux-x64.tar.gz" -C /usr/local --strip-components=1 \
    && rm "node-v$NODE_VERSION-linux-x64.tar.gz" SHASUMS256.txt.asc \
    && npm install -g npm@"$NPM_VERSION" \
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
    && rm -rf /code/po \
    && rm -rf /code/public \
    && rm -rf /code/tasks \
    && rm -rf /code/views \
    && rm -f /code/bower.json \
    && rm -f /code/gulpfile.js

EXPOSE 9000 9001
ENV NODE_ENV production

CMD ["node", "/code/server.js"]
