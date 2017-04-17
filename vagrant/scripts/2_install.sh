#!/bin/bash

git config http.sslVerify "false"
env GIT_SSL_NO_VERIFY=true git clone https://r1l-gitlab/sages/openessence.git
cd openessence

	
npm install -g gulp bower@1.7.9
npm install gulp
npm install

bower cache clean
bower install --force
bower prune

gulp build