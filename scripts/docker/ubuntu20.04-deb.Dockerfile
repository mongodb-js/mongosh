FROM ubuntu:20.04

ARG artifact_url=""
ADD ${artifact_url} /tmp
RUN dpkg -i /tmp/mongosh_*_amd64.deb
ENTRYPOINT [ "mongosh" ]
