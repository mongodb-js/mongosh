FROM node:16

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN apt-get install -y krb5-user

COPY krb5.conf /etc/krb5.conf
COPY kerberos-run.sh /tmp/kerberos-run.sh

CMD [ "/tmp/kerberos-run.sh" ]
