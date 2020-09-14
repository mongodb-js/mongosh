FROM ubuntu:20.04

ARG commit=""
ADD https://s3.amazonaws.com/mciuploads/mongosh/${commit}/mongosh-0.2.2-linux.tgz /tmp
RUN tar zxvf /tmp/mongosh-0.2.2-linux.tgz && \
  mv mongosh /usr/bin/mongosh

ENTRYPOINT [ "mongosh" ]
