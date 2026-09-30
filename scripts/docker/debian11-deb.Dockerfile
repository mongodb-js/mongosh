FROM debian:11

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules

# Debian 11 (bullseye) LTS ended 2026-08-31 (https://wiki.debian.org/LTS).
# TODO(MONGOSH-3476): Ignore the expiry field in apt repository metadata until we drop Debian 11 support.
RUN echo 'Acquire::Check-Valid-Until "false";' > /etc/apt/apt.conf.d/99no-check-valid-until

RUN apt-get update
RUN apt-get install -y man-db
RUN apt-get install -y /tmp/*mongosh*.deb
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-crypt-library-version/node_modules/.bin/mongodb-crypt-library-version /usr/lib/mongosh_crypt_v1.so | grep -Eq '^mongo_(crypt|csfle)_v1-'
RUN man mongosh | grep -q tlsAllowInvalidCertificates
ENTRYPOINT [ "mongosh" ]
