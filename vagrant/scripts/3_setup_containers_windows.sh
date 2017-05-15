#!/bin/bash

env GIT_SSL_NO_VERIFY=true git clone https://r1l-gitlab/sages/openessence.git
cd openessence

sudo systemctl start docker
sudo docker pull elasticsearch:2.4-alpine
sudo docker pull redis:alpine

sudo docker rm -f elasticsearch
sudo docker rm -f redis
sudo docker run -d -p 9200:9200 -p 9300:9300 --restart=always -v "$PWD/data":/usr/share/elasticsearch/data -v "$PWD/elasticsearch/config/elasticsearch.yml":/usr/share/elasticsearch/config/elasticsearch.yml --privileged --name elasticsearch elasticsearch:2.4-alpine
sudo docker run -d -p 6379:6379 --restart=always --name redis redis:alpine