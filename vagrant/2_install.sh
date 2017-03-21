#!/bin/bash

env GIT_SSL_NO_VERIFY=true git clone https://r1l-gitlab/sages/openessence.git
cd openessence
git config http.sslVerify "false"
	
npm install -g gulp bower
npm install

bower cache clean
bower install --force
bower prune
