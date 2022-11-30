FROM ubuntu:22.04

ARG artifact_url=""
ADD ${artifact_url} /tmp
RUN apt-get update
RUN apt-get install -y /tmp/*mongosh*.deb
RUN /usr/bin/mongosh --build-info

# alternate config for regression-testing https://jira.mongodb.org/browse/MONGOSH-1320
RUN useradd --user-group --system --create-home --no-log-init mongodb
RUN mkdir /home/mongodb/.mongodb
RUN chmod -w /home/mongodb/.mongodb
RUN touch /home/mongodb/.mongoshrc.js

USER mongodb
WORKDIR /home/mongodb

ENTRYPOINT [ "mongosh" ]
