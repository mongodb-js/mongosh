FROM ubuntu:20.04

RUN apt-get update
RUN apt-get -y -qq install curl apt-transport-https ca-certificates apt-utils software-properties-common

# Add Node.js
RUN curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo "deb https://deb.nodesource.com/node_14.x focal main" | tee /etc/apt/sources.list.d/nodesource.list
RUN echo "deb-src https://deb.nodesource.com/node_14.x focal main" | tee -a /etc/apt/sources.list.d/nodesource.list

RUN apt-get update
RUN apt-get -y -qq install nodejs libsnmp35

RUN mkdir -p /opt/mongodb /var/mongodb/db
RUN curl -o /opt/mongodb/full.json https://downloads.mongodb.org/full.json
RUN node -p 'require("/opt/mongodb/full.json").versions.find(v=>v.version==="4.4.1").downloads.find(d=>d.target==="ubuntu2004"&&d.arch==="x86_64").archive.url' | tee /opt/mongodb/sourceurl
RUN curl -sSL `cat /opt/mongodb/sourceurl` | tar --wildcards -C /opt/mongodb --strip-components=1 -xzvf - '*/bin/mongod'
RUN /opt/mongodb/bin/mongod --version

ENTRYPOINT [ "bash" ]
