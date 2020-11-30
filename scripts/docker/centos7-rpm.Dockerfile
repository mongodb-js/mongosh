FROM centos:7

ARG commit=""
ARG version=""
ADD https://s3.amazonaws.com/mciuploads/mongosh/${commit}/mongosh-${version}-x86_64.rpm /tmp
RUN rpm -ivh /tmp/mongosh-${version}-x86_64.rpm
ENTRYPOINT [ "mongosh" ]
