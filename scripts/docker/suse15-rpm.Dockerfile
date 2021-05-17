FROM registry.suse.com/suse/sle15

ARG artifact_url=""
ADD ${artifact_url} /tmp
RUN zypper --no-gpg-checks --non-interactive addrepo https://download.opensuse.org/repositories/openSUSE:Leap:15.1:Update/standard/openSUSE:Leap:15.1:Update.repo
RUN zypper --no-gpg-checks --non-interactive refresh
RUN zypper --no-gpg-checks --non-interactive install /tmp/*mongosh-*.x86_64.rpm
ENTRYPOINT [ "mongosh" ]
