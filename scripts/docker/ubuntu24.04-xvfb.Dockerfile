FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN apt-get -y -qq install git curl apt-transport-https ca-certificates apt-utils software-properties-common

# Install Node.js using nvm with version from VS Code's .nvmrc
# This ensures we test with the same Node.js version that VS Code uses
ENV NVM_DIR="/root/.nvm"
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash && \
    . "$NVM_DIR/nvm.sh" && \
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion" && \
    NODE_VERSION=$(curl -fsSL https://raw.githubusercontent.com/microsoft/vscode/refs/heads/main/.nvmrc | tr -d '[:space:]') && \
    echo "Installing Node.js version from VS Code .nvmrc: $NODE_VERSION" && \
    nvm install --no-progress $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    nvm use $NODE_VERSION && \
    echo "export NVM_DIR=\"$NVM_DIR\"" >> /root/.bashrc && \
    echo "export PATH=\"$NVM_DIR/versions/node/v${NODE_VERSION}/bin:\$PATH\"" >> /root/.bashrc

# Set PATH so node/npm are available in all contexts (using wildcard since we don't know the version at Docker ENV time)
RUN bash -c ". $NVM_DIR/nvm.sh && ln -sf \$(which node) /usr/local/bin/node && ln -sf \$(which npm) /usr/local/bin/npm"

# Install vscode dependencies
RUN apt-get -y -qq install libnss3 gnupg libxkbfile1 libsecret-1-0 libsecret-1-dev libgtk-3-0t64 libxss1 libgbm1 libasound2t64 xvfb build-essential pkg-config

ENTRYPOINT [ "bash" ]
