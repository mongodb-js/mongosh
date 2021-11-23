FROM fedora:34

ARG artifact_url=""
ADD ${artifact_url} /tmp
RUN yum repolist
RUN yum install -y man
RUN yum install -y /tmp/*mongosh-*.x86_64.rpm
RUN /usr/bin/mongosh --version
RUN /usr/libexec/mongocryptd-mongosh --version
ENTRYPOINT [ "mongosh" ]
