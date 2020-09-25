FROM ubuntu:16.04

RUN apt-get update
RUN apt-get -y -qq install build-essential python2.7 curl apt-transport-https ca-certificates apt-utils software-properties-common

# Add Node.js
RUN curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo "deb https://deb.nodesource.com/node_12.x xenial main" | tee /etc/apt/sources.list.d/nodesource.list
RUN echo "deb-src https://deb.nodesource.com/node_12.x xenial main" | tee -a /etc/apt/sources.list.d/nodesource.list

# Add sufficiently recent compiler toolchain
RUN add-apt-repository ppa:ubuntu-toolchain-r/test

RUN apt-get update
RUN apt-get -y -qq install nodejs g++-9 rpm

ENV CC=gcc-9
ENV CXX=g++-9

ENTRYPOINT [ "bash" ]
