FROM centos:6

ARG commit=""
ADD https://s3.amazonaws.com/mciuploads/mongosh/${commit}/mongosh-0.2.2-x86_64.rpm /tmp
RUN rpm -ivh /tmp/mongosh-0.2.2-x86_64.rpm
ENTRYPOINT [ "mongosh" ]
