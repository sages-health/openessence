#!/bin/bash
	
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash
source ~/.bashrc
nvm install  4.8.3
npm update -g npm
sudo yum update
sudo dnf install -y make
sudo dnf install -y gcc-c++
sudo dnf install -y python
sudo dnf install -y docker-engine
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo sh -c 'echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/vscode.repo'
sudo dnf check-update
sudo dnf install -y code
code --install-extension PeterJausovec.vscode-docker
code --install-extension waderyan.nodejs-extension-pack
code --install-extension donjayamanne.githistory
code --install-extension robertohuertasm.vscode-icons
npm install -g eslint
sudo curl -L "https://github.com/docker/compose/releases/download/1.9.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/bin/docker-compose
sudo chmod +x /usr/bin/docker-compose
sudo systemctl enable docker.service
sudo yum install -y git