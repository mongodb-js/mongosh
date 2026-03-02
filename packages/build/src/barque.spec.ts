import { expect } from 'chai';
import { promises as fs } from 'fs';
import nock from 'nock';
import fetch from 'node-fetch';
import path from 'path';
import sinon from 'sinon';
import { URL } from 'url';
import { Barque, LATEST_CURATOR, getReposAndArch } from './barque';
import type { Config } from './config';
import { ALL_PACKAGE_VARIANTS } from './config';
import { dummyConfig } from '../test/helpers';

describe('Barque', function () {
  let barque: Barque;
  let config: Config;

  beforeEach(function () {
    config = { ...dummyConfig };

    barque = new Barque(config);
  });

  describe('releaseToBarque', function () {
    context('platform is linux', function () {
      context('execCurator function succeeds', function () {
        (
          [
            {
              variant: 'deb-x64',
              url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh_0.1.0_amd64.deb',
              publishedUrls: [
                'https://repo.mongodb.org/apt/ubuntu/dists/bionic/mongodb-org/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/bionic/mongodb-enterprise/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/bionic/mongodb-org/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/bionic/mongodb-enterprise/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/bionic/mongodb-org/6.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/bionic/mongodb-enterprise/6.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/bionic/mongodb-org/7.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/bionic/mongodb-enterprise/7.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/6.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/6.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/7.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/7.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/8.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/8.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/focal/mongodb-org/8.2/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/focal/mongodb-enterprise/8.2/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/jammy/mongodb-org/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/jammy/mongodb-enterprise/4.4/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/jammy/mongodb-org/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/jammy/mongodb-enterprise/5.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/jammy/mongodb-org/6.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/jammy/mongodb-enterprise/6.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/jammy/mongodb-org/7.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/jammy/mongodb-enterprise/7.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/jammy/mongodb-org/8.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/jammy/mongodb-enterprise/8.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/jammy/mongodb-org/8.2/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/jammy/mongodb-enterprise/8.2/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/noble/mongodb-org/8.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/noble/mongodb-enterprise/8.0/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/ubuntu/dists/noble/mongodb-org/8.2/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/ubuntu/dists/noble/mongodb-enterprise/8.2/multiverse/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/buster/mongodb-org/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/buster/mongodb-enterprise/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/buster/mongodb-org/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/buster/mongodb-enterprise/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/buster/mongodb-org/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/buster/mongodb-enterprise/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/buster/mongodb-org/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/buster/mongodb-enterprise/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bullseye/mongodb-org/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bullseye/mongodb-enterprise/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bullseye/mongodb-org/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bullseye/mongodb-enterprise/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bullseye/mongodb-org/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bullseye/mongodb-enterprise/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bullseye/mongodb-org/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bullseye/mongodb-enterprise/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bookworm/mongodb-org/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bookworm/mongodb-enterprise/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bookworm/mongodb-org/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bookworm/mongodb-enterprise/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bookworm/mongodb-org/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bookworm/mongodb-enterprise/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bookworm/mongodb-org/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bookworm/mongodb-enterprise/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bookworm/mongodb-org/8.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bookworm/mongodb-enterprise/8.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/bookworm/mongodb-org/8.2/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/bookworm/mongodb-enterprise/8.2/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/trixie/mongodb-org/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/trixie/mongodb-enterprise/4.4/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/trixie/mongodb-org/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/trixie/mongodb-enterprise/5.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/trixie/mongodb-org/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/trixie/mongodb-enterprise/6.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/trixie/mongodb-org/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/trixie/mongodb-enterprise/7.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/trixie/mongodb-org/8.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/trixie/mongodb-enterprise/8.0/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.org/apt/debian/dists/trixie/mongodb-org/8.2/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
                'https://repo.mongodb.com/apt/debian/dists/trixie/mongodb-enterprise/8.2/main/binary-amd64/mongodb-mongosh_0.1.0_amd64.deb',
              ],
            },
            {
              variant: 'rpm-x64',
              url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              publishedUrls: [
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2013.03/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2013.03/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2013.03/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2013.03/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/12/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/12/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/12/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/12/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/12/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/12/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/12/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/12/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/15/mongodb-org/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/15/mongodb-enterprise/4.4/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/15/mongodb-org/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/15/mongodb-enterprise/5.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/15/mongodb-org/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/15/mongodb-enterprise/6.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/15/mongodb-org/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/15/mongodb-enterprise/7.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/15/mongodb-org/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/15/mongodb-enterprise/8.0/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/zypper/suse/15/mongodb-org/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/zypper/suse/15/mongodb-enterprise/8.2/x86_64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              ],
            },
            {
              variant: 'rpm-arm64',
              url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              publishedUrls: [
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/9/mongodb-org/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/9/mongodb-enterprise/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/redhat/10/mongodb-org/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/redhat/10/mongodb-enterprise/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2/mongodb-org/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/4.4/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/5.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/6.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/7.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/8.0/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.org/yum/amazon/2023/mongodb-org/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
                'https://repo.mongodb.com/yum/amazon/2023/mongodb-enterprise/8.2/aarch64/RPMS/mongodb-mongosh-0.1.0.el7.x86_64.rpm',
              ],
            },
            {
              variant: 'rpm-s390x',
              url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh-0.1.0.el7.s390x.rpm',
              publishedUrls: [
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/4.4/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/4.4/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/5.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/5.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/6.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/6.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/7.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/7.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/4.4/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/4.4/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/5.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/5.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/6.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/7.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.0/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.2/s390x/RPMS/mongodb-mongosh-0.1.0.el7.s390x.rpm',
              ],
            },
            {
              variant: 'rpm-ppc64le',
              url: 'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
              publishedUrls: [
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/4.4/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/4.4/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/5.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/5.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/6.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/6.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.org/yum/redhat/7/mongodb-org/7.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/7/mongodb-enterprise/7.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/4.4/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/4.4/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/5.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/5.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/6.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/6.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.org/yum/redhat/8/mongodb-org/7.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/7.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.0/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
                'https://repo.mongodb.com/yum/redhat/8/mongodb-enterprise/8.2/ppc64le/RPMS/mongodb-mongosh-0.1.0.el7.ppc64le.rpm',
              ],
            },
          ] as const
        ).forEach(({ variant, url, publishedUrls }) => {
          it(`publishes ${variant} packages`, async function () {
            barque.createCuratorDir = sinon
              .stub()
              .resolves(path.join(__dirname, '..', 'test', 'fixtures', 'bin'));
            barque.extractLatestCurator = sinon.stub().resolves(true);

            let releasedUrls;
            try {
              releasedUrls = await barque.releaseToBarque(variant, url, false);
            } catch (err: any) {
              if (
                process.platform === 'win32' &&
                err.message.includes('ENOENT')
              ) {
                return; // Cannot spawn the fake curator on Windows
              }
              throw err;
            }

            expect(releasedUrls).to.deep.equal(publishedUrls);
            expect(barque.createCuratorDir).to.have.been.called;
            expect(barque.extractLatestCurator).to.have.been.called;
          });
        });
      });

      it('execCurator function fails', async function () {
        barque.createCuratorDir = sinon
          .stub()
          .returns(Promise.resolve('/nonexistent/'));
        barque.extractLatestCurator = sinon
          .stub()
          .returns(Promise.resolve(true));

        const debUrl =
          'https://s3.amazonaws.com/mciuploads/mongosh/5ed7ee5d8683818eb28d9d3b5c65837cde4a08f5/mongodb-mongosh_0.1.0_amd64.deb';

        try {
          await barque.releaseToBarque('deb-x64', debUrl, false);
        } catch (error: any) {
          expect(error.message).to.include(
            `Curator is unable to upload ${debUrl},ubuntu1804,amd64 to barque`
          );
          expect(barque.createCuratorDir).to.have.been.called;
          expect(barque.extractLatestCurator).to.have.been.called;
          return;
        }
        expect.fail('Expected error');
      });
    });

    it('platform is not linux', function () {
      config.platform = 'darwin';
      try {
        barque = new Barque(config);
      } catch (e: any) {
        expect(e.message).to.contain('only supported on linux');
        return;
      }
      expect.fail('Expected error');
    });
  });

  describe('getReposAndArch', function () {
    for (const variant of ALL_PACKAGE_VARIANTS) {
      it(`returns results for ${variant}`, function () {
        const result = getReposAndArch(variant);
        expect(result.ppas).to.be.an('array');
        expect(result.arch).to.be.a('string');
        if (result.ppas.length > 0) {
          expect(result.ppas[0].repo).to.be.a('string');
          expect(result.ppas[0].serverVersions).to.be.an('array');
        }
      });
    }
  });

  describe('createCuratorDir', function () {
    it('creates tmp directory that exists', async function () {
      const curatorDirPath = await barque.createCuratorDir();

      let accessErr: Error | undefined = undefined;
      try {
        await fs.access(curatorDirPath);
      } catch (e: any) {
        accessErr = e;
      }
      expect(accessErr).to.be.undefined;
    });
  });

  describe('waitUntilPackagesAreAvailable', function () {
    beforeEach(function () {
      nock.cleanAll();
    });

    context('with packages published one after the other', function () {
      let nockRepo: nock.Scope;

      beforeEach(function () {
        nockRepo = nock('https://repo.mongodb.org');

        nockRepo.head('/apt/dist/package1.deb').reply(200);

        nockRepo.head('/apt/dist/package2.deb').twice().reply(404);
        nockRepo.head('/apt/dist/package2.deb').reply(200);

        nockRepo.head('/apt/dist/package3.deb').reply(404);
        nockRepo.head('/apt/dist/package3.deb').reply(200);
      });

      it('waits until all packages are available', async function () {
        await barque.waitUntilPackagesAreAvailable(
          [
            'https://repo.mongodb.org/apt/dist/package1.deb',
            'https://repo.mongodb.org/apt/dist/package2.deb',
            'https://repo.mongodb.org/apt/dist/package3.deb',
          ],
          300,
          1
        );

        expect(nock.isDone()).to.be.true;
      });
    });

    context('with really slow packages', function () {
      let nockRepo: nock.Scope;

      beforeEach(function () {
        nockRepo = nock('https://repo.mongodb.org');
        nockRepo.head('/apt/dist/package1.deb').reply(200);
        nockRepo.head('/apt/dist/package2.deb').reply(404).persist();
      });

      it('fails when the timeout is hit', async function () {
        try {
          await barque.waitUntilPackagesAreAvailable(
            [
              'https://repo.mongodb.org/apt/dist/package1.deb',
              'https://repo.mongodb.org/apt/dist/package2.deb',
            ],
            5,
            1
          );
        } catch (e: any) {
          expect(e.message).to.contain(
            'the following packages are still not available'
          );
          expect(e.message).to.contain('package2.deb');
        }
      });
    });
  });

  describe('LATEST_CURATOR', function () {
    it('can be downloaded', async function () {
      const response = await fetch(LATEST_CURATOR, {
        method: 'HEAD',
      });

      expect(response.ok).to.be.true;
    });
  });

  describe('extractLatestCurator', function () {
    beforeEach(function () {
      nock.cleanAll();
      const latestCuratorUrl = new URL(LATEST_CURATOR);
      nock(latestCuratorUrl.origin)
        .get(latestCuratorUrl.pathname)
        .replyWithFile(
          200,
          path.join(__dirname, '..', 'examples', 'fake-curator.tar.gz'),
          {
            'Content-Type': 'application/gzip',
          }
        );
    });

    afterEach(function () {
      expect(nock.isDone(), 'HTTP calls to link urls were not done').to.be.true;
    });

    it('extracts latest curator to tmp directory', async function () {
      const curatorDirPath = await barque.createCuratorDir();
      const curatorPath = path.join(curatorDirPath, 'curator');

      await barque.extractLatestCurator(curatorDirPath);

      let accessErr: Error | undefined = undefined;
      try {
        await fs.access(curatorPath);
      } catch (e: any) {
        accessErr = e;
      }
      expect(accessErr).to.be.undefined;
    });
  });
});
