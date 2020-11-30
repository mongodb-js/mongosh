FROM ubuntu:16.04

ARG commit=""
ARG version=""
ADD https://s3.amazonaws.com/mciuploads/mongosh/${commit}/mongosh_${version}_amd64.deb /tmp
RUN dpkg -i /tmp/mongosh_${version}_amd64.deb
ENTRYPOINT [ "mongosh" ]


