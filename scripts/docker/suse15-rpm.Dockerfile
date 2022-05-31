FROM registry.suse.com/suse/sle15

ARG artifact_url=""
ADD ${artifact_url} /tmp
ADD node_modules /usr/share/mongodb-csfle-library-version/node_modules
RUN zypper --no-gpg-checks --non-interactive addrepo https://download.opensuse.org/repositories/openSUSE:Leap:15.1:Update/standard/openSUSE:Leap:15.1:Update.repo
RUN zypper --no-gpg-checks --non-interactive refresh
RUN zypper --no-gpg-checks --non-interactive install man
RUN zypper --no-gpg-checks --non-interactive install /tmp/*mongosh*.rpm
RUN /usr/bin/mongosh --build-info
RUN env MONGOSH_RUN_NODE_SCRIPT=1 mongosh /usr/share/mongodb-csfle-library-version/node_modules/.bin/mongodb-csfle-library-version /usr/lib64/mongosh_csfle_v1.so | grep -q ^mongo_csfle_v1-
RUN man mongosh | grep -q tlsAllowInvalidCertificates
ENTRYPOINT [ "mongosh" ]
