FROM rockylinux:8

RUN dnf repolist
RUN dnf -y install 'dnf-command(config-manager)'
RUN dnf config-manager --set-enabled powertools
RUN dnf -y install epel-release
RUN dnf -y install python3 rpm-build dpkg-devel dpkg-dev git

# Add Node.js
RUN curl -sL https://rpm.nodesource.com/setup_20.x | bash -
RUN dnf install -y nodejs
RUN npm i -g npm@10.x
# For some reason npm@8 failed silently (!) when $HOME was
# set to /root and consequently $HOME/.npm was not writable
RUN mkdir -p /tmp/home
ENV HOME=/tmp/home

ENTRYPOINT [ "bash" ]
