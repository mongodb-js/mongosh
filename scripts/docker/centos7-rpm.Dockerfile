FROM centos:7

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
# centos7 is eol, switch to vault repos
RUN yum-config-manager --disable base extras updates
RUN yum-config-manager --enable C7.8.2003-base C7.8.2003-extras C7.8.2003-updates
RUN yum repolist
RUN yum install -y /tmp/*mongosh*.rpm
RUN /usr/bin/mongosh --build-info
ENV MONGOSH_NO_AUTOMATIC_ENCRYPTION_SUPPORT=1
ENTRYPOINT [ "mongosh" ]
