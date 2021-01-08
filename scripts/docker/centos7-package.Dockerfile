FROM centos:7

RUN yum repolist
RUN yum install -y python3 rpm-build dpkg-devel dpkg-dev

# Add Node.js
RUN curl -sL https://rpm.nodesource.com/setup_14.x | bash -
RUN yum install -y nodejs

ENTRYPOINT [ "bash" ]
