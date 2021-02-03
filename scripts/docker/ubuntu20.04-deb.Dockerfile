FROM ubuntu:20.04

ARG artifact_url=""
ADD ${artifact_url} /tmp
RUN apt-get install -y --install-recommends /tmp/mongosh_*_amd64.deb
ENTRYPOINT [ "mongosh" ]
