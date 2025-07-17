FROM debian:10

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules

# Update sources.list to use archived repositories for Debian 10 (buster)
RUN sed -i 's|http://deb.debian.org/debian|http://archive.debian.org/debian|g' /etc/apt/sources.list && \
    sed -i '/security.debian.org/d' /etc/apt/sources.list && \
    echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99no-check-valid-until

RUN apt-get update
RUN apt-get install -y man-db
RUN apt-get install -y /tmp/*mongosh*.deb
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-crypt-library-version/node_modules/.bin/mongodb-crypt-library-version /usr/lib/mongosh_crypt_v1.so | grep -Eq '^mongo_(crypt|csfle)_v1-'
RUN man mongosh | grep -q tlsAllowInvalidCertificates
ENTRYPOINT [ "mongosh" ]
