FROM centos:8

ARG commit=""
ADD https://s3.amazonaws.com/mciuploads/mongosh/${commit}/mongosh-0.2.2-x86_64.rpm /tmp
RUN yum localinstall -y /tmp/mongosh-0.2.2-x86_64.rpm
ENTRYPOINT [ "mongosh" ]
