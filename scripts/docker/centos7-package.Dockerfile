FROM centos:7

RUN yum install -y centos-release-scl epel-release
RUN yum repolist
RUN yum install -y python3 rpm-build dpkg-devel dpkg-dev

# Add Node.js
RUN curl -sL https://rpm.nodesource.com/setup_14.x | bash -
RUN yum install -y nodejs

ENTRYPOINT [ "bash" ]
