import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

import getConnectExtraInfo from './connect-info';
import { ConnectionString } from 'mongodb-connection-string-url';

describe('getConnectInfo', function () {
  const BUILD_INFO = {
    version: '3.2.0-rc2',
    gitVersion: '8a3acb42742182c5e314636041c2df368232bbc5',
    modules: ['enterprise'],
    allocator: 'system',
    javascriptEngine: 'mozjs',
    sysInfo: 'deprecated',
    versionArray: [3, 2, 0, -48],
    openssl: {
      running: 'OpenSSL 0.9.8zg 14 July 2015',
      compiled: 'OpenSSL 0.9.8y 5 Feb 2013',
    },
    buildEnvironment: {
      distmod: '',
      distarch: 'x86_64',
      cc: 'gcc: Apple LLVM version 5.1 (clang-503.0.40) (based on LLVM 3.4svn)',
      ccflags:
        '-fno-omit-frame-pointer -fPIC -fno-strict-aliasing -ggdb -pthread -Wall -Wsign-compare -Wno-unknown-pragmas -Winvalid-pch -Werror -O2 -Wno-unused-function -Wno-unused-private-field -Wno-deprecated-declarations -Wno-tautological-constant-out-of-range-compare -Wno-unused-const-variable -Wno-missing-braces -mmacosx-version-min=10.7 -fno-builtin-memcmp',
      cxx: 'g++: Apple LLVM version 5.1 (clang-503.0.40) (based on LLVM 3.4svn)',
      cxxflags:
        '-Wnon-virtual-dtor -Woverloaded-virtual -stdlib=libc++ -std=c++11',
      linkflags:
        '-fPIC -pthread -Wl,-bind_at_load -mmacosx-version-min=10.7 -stdlib=libc++ -fuse-ld=gold',
      target_arch: 'x86_64',
      target_os: 'osx',
    },
    bits: 64,
    debug: false,
    maxBsonObjectSize: 16777216,
    storageEngines: [
      'devnull',
      'ephemeralForTest',
      'inMemory',
      'mmapv1',
      'wiredTiger',
    ],
    ok: 1,
  };

  const ATLAS_VERSION = '20210330.0.0.1617063608';

  const ATLAS_URI =
    'mongodb+srv://admin:catscatscats@cat-data-sets.cats.mongodb.net/admin';

  const ATLAS_URI_WITH_AUTH =
    'mongodb+srv://admin:catscatscats@cat-data-sets.cats.mongodb.net/admin?authMechanism=PLAIN&authSource=%24external';

  it('reports on an enterprise version >=3.2 of mongodb with credentials', async function () {
    const output = {
      is_atlas: true,
      is_atlas_url: true,
      is_localhost: false,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: 'PLAIN',
      is_data_federation: false,
      is_stream: false,
      dl_version: undefined,
      atlas_version: '20210330.0.0.1617063608',
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: ATLAS_URI_WITH_AUTH,
      is_local_atlas: false,
    };
    await expect(
      getConnectExtraInfo({
        connectionString: new ConnectionString(ATLAS_URI_WITH_AUTH),
        buildInfo: Promise.resolve(BUILD_INFO),
        atlasVersion: Promise.resolve(ATLAS_VERSION),
        resolvedHostname: 'test-data-sets-00-02-a011bb.mongodb.net',
        isLocalAtlas: Promise.resolve(false),
      })
    ).to.eventually.deep.equal(output);
  });

  it('reports on an enterprise version >=3.2 of mongodb with no credentials', async function () {
    const output = {
      is_atlas: true,
      is_atlas_url: true,
      is_localhost: false,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: undefined,
      is_data_federation: false,
      is_stream: false,
      dl_version: undefined,
      atlas_version: '20210330.0.0.1617063608',
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: ATLAS_URI,
      is_local_atlas: false,
    };
    await expect(
      getConnectExtraInfo({
        connectionString: new ConnectionString(ATLAS_URI),
        buildInfo: Promise.resolve(BUILD_INFO),
        atlasVersion: Promise.resolve(ATLAS_VERSION),
        resolvedHostname: 'test-data-sets-00-02-a011bb.mongodb.net',
        isLocalAtlas: Promise.resolve(false),
      })
    ).to.eventually.deep.equal(output);
  });

  it('reports correct information when a stream uri is passed', async function () {
    const streamUri =
      'mongodb://atlas-stream-67b8e1cd6d60357be377be7b-1dekw.virginia-usa.a.query.mongodb-dev.net/';
    const output = {
      is_atlas: true,
      is_atlas_url: true,
      is_localhost: false,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: undefined,
      is_data_federation: false,
      is_stream: true,
      dl_version: undefined,
      atlas_version: undefined,
      is_genuine: true,
      is_local_atlas: false,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: streamUri,
    };
    await expect(
      getConnectExtraInfo({
        connectionString: new ConnectionString(streamUri),
        buildInfo: Promise.resolve(BUILD_INFO),
        atlasVersion: Promise.resolve(undefined),
        resolvedHostname:
          'atlas-stream-67b8e1cd6d60357be377be7b-1dekw.virginia-usa.a.query.mongodb-dev.net',
        isLocalAtlas: Promise.resolve(false),
      })
    ).to.eventually.deep.equal(output);
  });

  it('reports correct information when an empty uri is passed', async function () {
    const output = {
      is_atlas: false,
      is_atlas_url: false,
      is_localhost: true,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: undefined,
      is_data_federation: false,
      is_stream: false,
      dl_version: undefined,
      atlas_version: undefined,
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: '',
      is_local_atlas: true,
    };
    await expect(
      getConnectExtraInfo({
        buildInfo: Promise.resolve(BUILD_INFO),
        atlasVersion: Promise.resolve(undefined),
        resolvedHostname: 'localhost',
        isLocalAtlas: Promise.resolve(true),
      })
    ).to.eventually.deep.equal(output);
  });

  it('does not fail when buildInfo is unavailable', async function () {
    const output = {
      is_atlas: false,
      is_atlas_url: false,
      is_localhost: false,
      is_do_url: false,
      server_version: undefined,
      is_enterprise: false,
      auth_type: undefined,
      is_data_federation: false,
      is_stream: false,
      dl_version: undefined,
      atlas_version: undefined,
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      node_version: process.version,
      server_arch: undefined,
      server_os: undefined,
      uri: '',
      is_local_atlas: false,
    };
    await expect(
      getConnectExtraInfo({
        buildInfo: Promise.resolve(null),
        atlasVersion: Promise.resolve(undefined),
        isLocalAtlas: Promise.resolve(false),
      })
    ).to.eventually.deep.equal(output);
  });
});
