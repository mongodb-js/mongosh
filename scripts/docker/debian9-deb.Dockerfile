FROM debian:9

# Debian 9 (strech) packages have been moved from deb.debian.org to archive.debian.org
RUN /bin/echo -e 'deb http://archive.debian.org/debian stretch main\ndeb http://archive.debian.org/debian-security stretch/updates main\ndeb http://archive.debian.org/debian stretch main\n' > /etc/apt/sources.list

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
RUN apt-get update
RUN apt-get install -y man-db
RUN apt-get install -y /tmp/*mongosh*.deb
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-crypt-library-version/node_modules/.bin/mongodb-crypt-library-version /usr/lib/mongosh_crypt_v1.so | grep -Eq '^mongo_(crypt|csfle)_v1-'
RUN man mongosh | grep -q tlsAllowInvalidCertificates
ENTRYPOINT [ "mongosh" ]
