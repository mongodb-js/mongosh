FROM amazonlinux:2

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-csfle-library-version/node_modules
RUN yum repolist
RUN yum install -y /tmp/*mongosh*.rpm
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-csfle-library-version/node_modules/.bin/mongodb-csfle-library-version /usr/lib64/mongosh_csfle_v1.so | grep -q ^mongo_csfle_v1-
ENV MONGOSH_SMOKE_TEST_OS_HAS_FIPS_SUPPORT=1
ENTRYPOINT [ "mongosh" ]
