FROM registry.suse.com/suse/sles12sp5

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-crypt-library-version/node_modules
RUN zypper --no-gpg-checks --non-interactive refresh
# For some reason zypper ignores half of the files listed for installation in
# the rpm package (in particular the man files are not copied over as expected),
# using rpm directly seems to fix the issue
RUN rpm -i /tmp/*mongosh*.rpm
RUN /usr/bin/mongosh --build-info
ENV MONGOSH_NO_AUTOMATIC_ENCRYPTION_SUPPORT=1
ENTRYPOINT [ "mongosh" ]
