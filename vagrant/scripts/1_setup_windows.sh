#!/bin/bash
	
source ~/.bashrc

sudo yum update

sudo dnf install -y docker-engine

sudo curl -L "https://github.com/docker/compose/releases/download/1.9.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/bin/docker-compose
sudo chmod +x /usr/bin/docker-compose
sudo systemctl enable docker.service
sudo yum install -y git