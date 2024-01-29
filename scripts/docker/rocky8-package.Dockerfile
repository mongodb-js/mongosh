FROM rockylinux:8

ARG USER_ID
ARG GROUP_ID

RUN dnf repolist
RUN dnf -y install 'dnf-command(config-manager)'
RUN dnf config-manager --set-enabled powertools
RUN dnf -y install epel-release
RUN dnf -y install python3 rpm-build dpkg-devel dpkg-dev git

# Add Node.js
RUN curl -sL https://rpm.nodesource.com/setup_20.x | bash -
RUN dnf install -y nodejs
RUN npm i -g npm@9.x

# To ensure files written inside the container are accessible outside, we create a user/group 
# for the user_id and group_id provided to the dockerfile.  The docker file is built in CI with
# the current user_id and group_id.
RUN groupadd -g $GROUP_ID user
RUN useradd -u $USER_ID -g $GROUP_ID user
USER user

# For some reason npm@8 failed silently (!) when $HOME was
# set to /root and consequently $HOME/.npm was not writable
RUN mkdir -p /tmp/home
ENV HOME=/tmp/home

ENTRYPOINT [ "bash" ]
