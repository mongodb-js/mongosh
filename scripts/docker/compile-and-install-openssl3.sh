#!/bin/bash

# Install build requirements for OpenSSL 3, and compile and install it.
# This builds a version of OpenSSL that claims to be FIPS-compliant,
# for testing against FIPS.
# This script is intended for running in Docker containers.

set -e
set -x

# Install build dependencies
if apt -v; then
  apt -y update
  apt -y install build-essential curl
else
  dnf -y repolist
  dnf -y groupinstall "Development Tools"
  dnf -y install perl
fi

mkdir -p /tmp/build
pushd /tmp/build
# Download and unpack OpenSSL
curl -sSfLO https://www.openssl.org/source/openssl-3.6.0.tar.gz

tar xvzf openssl-*.tar.gz
rm -f openssl-*.tar.gz

# Remove possibly existing system OpenSSL 3 libraries
rm -f /lib/{x86_64,aarch64}-linux-gnu/libcrypto.so.3
rm -f /lib/{x86_64,aarch64}-linux-gnu/libssl.so.3

pushd openssl-*
# Compile and install OpenSSL.
./config --prefix=/usr shared fips
make -j12
make -j12 install install_ssldirs install_fips
popd
popd

# Link OpenSSL libraries to an alternative location for different
# library path conventions
ln -s /usr/lib64/libcrypto.so.3 /usr/lib/libcrypto.so.3 || true
ln -s /usr/lib64/libssl.so.3 /usr/lib/libssl.so.3 || true

# Activate FIPS in the OpenSSL config
sed -i /usr/ssl/openssl.cnf -e 's/# \.include fipsmodule\.cnf/.include \/usr\/ssl\/fipsmodule.cnf/'
sed -i /usr/ssl/openssl.cnf -e 's/# fips = fips_sect/fips = fips_sect/'
sed -i /usr/ssl/openssl.cnf -e 's/# activate = 1/activate = 1/'
