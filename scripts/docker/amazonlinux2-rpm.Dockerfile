FROM amazonlinux:2

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
RUN yum repolist
RUN yum install -y /tmp/*mongosh*.rpm
RUN /usr/bin/mongosh --build-info
# glibc here is too old to load the bundled crypt_shared library.
ENV MONGOSH_NO_AUTOMATIC_ENCRYPTION_SUPPORT=1
ENTRYPOINT [ "mongosh" ]
