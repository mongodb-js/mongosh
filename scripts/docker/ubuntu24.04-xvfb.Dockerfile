FROM ubuntu:24.04

ARG NODE_JS_VERSION
ENV NODE_JS_VERSION=${NODE_JS_VERSION}
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN apt-get -y -qq install git curl apt-transport-https ca-certificates apt-utils software-properties-common

# Install Node.js using nvm (reusing pattern from .evergreen/install-node.sh)
ENV NVM_DIR="/root/.nvm"
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" && \
    nvm install --no-progress $NODE_JS_VERSION && \
    nvm alias default $NODE_JS_VERSION && \
    nvm use $NODE_JS_VERSION

# Set PATH source nvm in interactive shells
RUN echo 'export PATH="$NVM_DIR/versions/node/v'"$NODE_JS_VERSION"'/bin:$PATH"' >> /root/.bashrc && \
    echo 'export PATH="$NVM_DIR/versions/node/v'"$NODE_JS_VERSION"'/bin:$PATH"' >> /root/.profile && \
    echo '. "$NVM_DIR/nvm.sh"' >> /root/.bashrc && \
    echo '. "$NVM_DIR/nvm.sh"' >> /root/.profile

# Install vscode dependencies
RUN apt-get -y -qq install libnss3 gnupg libxkbfile1 libsecret-1-0 libsecret-1-dev libgtk-3-0t64 libxss1 libgbm1 libasound2t64 xvfb build-essential pkg-config

ENTRYPOINT [ "bash" ]
