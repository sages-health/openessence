###############################################################################
# Dockerfile for Elasticsearch. Based on dockerfile/elasticsearch, but uses
# debian instead of ubuntu (for the smaller size), and OpenJDK instead of
# Oracle's JRE.
###############################################################################

FROM debian:jessie

MAINTAINER Gabe Gorelick, "https://github.com/gabegorelick"

RUN apt-get update
RUN apt-get install -y openjdk-7-jre-headless wget

# Download and install elasticsearch. We don't use their debs because this is easier and we don't care about
# the package manager (this is Docker after all).
RUN \
  cd /tmp && \
  wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.3.2.tar.gz && \
  tar xvzf elasticsearch-1.3.2.tar.gz && \
  rm -f elasticsearch-1.3.2.tar.gz && \
  mv /tmp/elasticsearch-1.3.2 /elasticsearch

VOLUME ["/data"]

ADD elasticsearch.yml /elasticsearch/config/elasticsearch.yml

WORKDIR /data

CMD ["/elasticsearch/bin/elasticsearch"]

# HTTP
EXPOSE 9200

# Transport
EXPOSE 9300
