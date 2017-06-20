#!/bin/bash

cd openessence

sudo docker build -f Dockerfile.prod -t sageshealth/openessence .

sudo docker run -d -p 9000:9000 --restart=always --link elasticsearch:elasticsearch --link redis:redis --name openessence sageshealth/openessence