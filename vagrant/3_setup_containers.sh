
#!/bin/bash
sudo service docker start
sudo docker run -d -p 9200:9200 -p 9300:9300 --restart=always -v /home/vagrant/data:/usr/share/elasticsearch/data --privileged --name elasticsearch elasticsearch:2.4 
sudo docker run -d -p 6379:6379 --restart=always  redis:alpine
sudo sleep 10
node server/migrations/reseed

