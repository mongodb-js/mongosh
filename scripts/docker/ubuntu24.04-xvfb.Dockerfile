FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN apt-get -y -qq install git curl apt-transport-https ca-certificates apt-utils software-properties-common

# Add Node.js
RUN curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo "deb https://deb.nodesource.com/node_20.x jammy main" | tee /etc/apt/sources.list.d/nodesource.list
RUN echo "deb-src https://deb.nodesource.com/node_20.x jammy main" | tee -a /etc/apt/sources.list.d/nodesource.list

# Install Node.js and vscode dependencies
RUN apt-get update
RUN apt-get -y -qq install nodejs libnss3 gnupg libxkbfile1 libsecret-1-0 libsecret-1-dev libgtk-3-0t64 libxss1 libgbm1 libasound2t64 xvfb build-essential pkg-config

ENTRYPOINT [ "bash" ]
