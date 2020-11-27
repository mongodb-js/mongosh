FROM ubuntu:16.04

RUN apt-get update
RUN apt-get -y -qq install build-essential python2.7 curl apt-transport-https ca-certificates apt-utils software-properties-common

# Add Node.js
RUN curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo "deb https://deb.nodesource.com/node_14.x xenial main" | tee /etc/apt/sources.list.d/nodesource.list
RUN echo "deb-src https://deb.nodesource.com/node_14.x xenial main" | tee -a /etc/apt/sources.list.d/nodesource.list

# Add sufficiently recent compiler toolchain
RUN add-apt-repository ppa:ubuntu-toolchain-r/test

RUN apt-get update
RUN apt-get -y -qq install nodejs g++-6 rpm

# Add sccache
RUN curl -L https://github.com/mozilla/sccache/releases/download/0.2.13/sccache-0.2.13-x86_64-unknown-linux-musl.tar.gz | tar -C /usr/local/bin -xzvf - --strip=1 sccache-0.2.13-x86_64-unknown-linux-musl/sccache

ENV CC="sccache gcc-6"
ENV CXX="sccache g++-6"

ENTRYPOINT [ "bash" ]
