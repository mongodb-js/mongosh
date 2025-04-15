FROM ubuntu:22.04

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
ADD qemu-wrap.sh /tmp
RUN apt-get update
RUN yes | unminimize
RUN apt-get install -y man-db qemu-user
RUN apt-get install -y /tmp/*mongosh*.deb
RUN /tmp/qemu-wrap.sh /usr/bin/mongosh
RUN /usr/bin/mongosh --build-info
# no mongodb-crypt-library-version check here because the crypt_shared library has its own architecture minima
RUN man mongosh | grep -q tlsAllowInvalidCertificates
ENTRYPOINT [ "mongosh" ]
