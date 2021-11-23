FROM ubuntu:20.04

ARG artifact_url=""
ADD ${artifact_url} /tmp
RUN apt-get update
RUN yes | unminimize
RUN apt-get install -y man-db
RUN apt-get install -y /tmp/*mongosh_*_amd64.deb
RUN /usr/bin/mongosh --version
RUN /usr/libexec/mongocryptd-mongosh --version
RUN man mongosh | grep -q tlsAllowInvalidCertificates
ENTRYPOINT [ "mongosh" ]
