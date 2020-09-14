FROM ubuntu:20.04

ARG commit=""
ADD https://s3.amazonaws.com/mciuploads/mongosh/${commit}/mongosh_0.2.2_amd64.deb /tmp
RUN dpkg -i /tmp/mongosh_0.2.2_amd64.deb
ENTRYPOINT [ "mongosh" ]


