#FROM node:16

#ENV DEBIAN_FRONTEND=noninteractive
#RUN apt-get update
#RUN apt-get install -y krb5-user

FROM rockylinux:8
RUN yum repolist
RUN yum install -y krb5-workstation krb5-libs
RUN ldd /lib64/libk5crypto.so.3

COPY krb5.conf /etc/krb5.conf
ADD https://downloads.mongodb.com/compass/mongosh-2.0.2-linux-x64.tgz /tmp
#ADD https://downloads.mongodb.com/compass/mongosh-2.0.2-linux-x64-openssl11.tgz /tmp
RUN cd /tmp && tar --strip-components=1 -xvf mongosh-2.0.2-*.tgz

CMD [ "/tmp/mongosh/packages/connectivity-tests/test/kerberos/kerberos-run.sh" ]
