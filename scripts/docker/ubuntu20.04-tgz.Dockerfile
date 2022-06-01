FROM ubuntu:20.04

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
RUN apt-get update
RUN apt-get install -y libgssapi-krb5-2
RUN tar -C /tmp --strip-components=1 -xvzf /tmp/*mongosh*.tgz
RUN ln -s /tmp/bin/mongosh /usr/bin/mongosh
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-crypt-library-version/node_modules/.bin/mongodb-crypt-library-version /tmp/bin/mongosh_crypt_v1.so | grep -Eq '^mongo_(crypt|csfle)_v1-'
ENTRYPOINT [ "mongosh" ]
