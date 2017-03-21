#!/bin/bash
	
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash
source ~/.bashrc
nvm install  0.10.38
npm update -g npm
sudo yum install -y make
sudo yum install -y gcc-c++
sudo yum install -y python
sudo yum install -y docker-engine
sudo curl -L "https://github.com/docker/compose/releases/download/1.9.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/bin/docker-compose
sudo chmod +x /usr/bin/docker-compose
sudo systemctl enable docker.service
sudo yum install -y git