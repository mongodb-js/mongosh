FROM amazonlinux:1

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-csfle-library-version/node_modules
RUN yum repolist
RUN yum install -y /tmp/*mongosh-*.x86_64.rpm
RUN /usr/bin/mongosh --version
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-csfle-library-version/node_modules/.bin/mongodb-csfle-library-version /usr/lib/mongosh_csfle_v1.so | grep -q ^mongo_csfle_v1-
ENTRYPOINT [ "mongosh" ]
