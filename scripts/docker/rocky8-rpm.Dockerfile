FROM rockylinux:8

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
RUN dnf repolist
RUN dnf install -y man
RUN dnf install -y /tmp/*mongosh*.rpm
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-crypt-library-version/node_modules/.bin/mongodb-crypt-library-version /usr/lib64/mongosh_crypt_v1.so | grep -Eq '^mongo_(crypt|csfle)_v1-'
RUN man mongosh | grep -q tlsAllowInvalidCertificates
ENV MONGOSH_SMOKE_TEST_OS_HAS_FIPS_SUPPORT=1
ENTRYPOINT [ "mongosh" ]
