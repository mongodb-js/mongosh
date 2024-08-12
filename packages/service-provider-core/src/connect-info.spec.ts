import { expect } from 'chai';
import getConnectExtraInfo, { getHostnameForConnection } from './connect-info';

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

  const ATLAS_VERSION = {
    atlasVersion: '20210330.0.0.1617063608',
    gitVersion: '8f7e5bdde713391e8123a463895bb7fb660a5ffd',
  };

  const ATLAS_URI =
    'mongodb+srv://admin:catscatscats@cat-data-sets.cats.mongodb.net/admin';

  it('reports on an enterprise version >=3.2 of mongodb with credentials', function () {
    const output = {
      is_atlas: true,
      is_atlas_url: true,
      is_localhost: false,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: 'LDAP',
      is_data_federation: false,
      is_stream: false,
      dl_version: null,
      atlas_version: '20210330.0.0.1617063608',
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: ATLAS_URI,
      is_local_atlas: false,
    };
    expect(
      getConnectExtraInfo(
        ATLAS_URI,
        BUILD_INFO,
        ATLAS_VERSION,
        {
          s: {
            credentials: {
              mechanism: 'LDAP',
            },
            servers: new Map().set('test-data-sets-00-02-a011bb.mongodb.net', {
              description: {
                address: 'test-data-sets-00-02-a011bb.mongodb.net',
              },
            }),
          },
        },
        false
      )
    ).to.deep.equal(output);
  });

  it('reports on an enterprise version >=3.2 of mongodb with no credentials', function () {
    const output = {
      is_atlas: true,
      is_atlas_url: true,
      is_localhost: false,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: null,
      is_data_federation: false,
      is_stream: false,
      dl_version: null,
      atlas_version: '20210330.0.0.1617063608',
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: ATLAS_URI,
      is_local_atlas: false,
    };
    expect(
      getConnectExtraInfo(
        ATLAS_URI,
        BUILD_INFO,
        ATLAS_VERSION,
        {
          s: {
            servers: new Map().set('test-data-sets-00-02-a011bb.mongodb.net', {
              description: {
                address: 'test-data-sets-00-02-a011bb.mongodb.net',
              },
            }),
          },
        },
        false
      )
    ).to.deep.equal(output);
  });

  it('reports correct information when a stream uri is passed', function () {
    const streamUri =
      'mongodb://atlas-stream-67b8e1cd6d60357be377be7b-1dekw.virginia-usa.a.query.mongodb-dev.net/';
    const output = {
      is_atlas: true,
      is_atlas_url: true,
      is_localhost: false,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: 'LDAP',
      is_data_federation: false,
      is_stream: true,
      dl_version: null,
      atlas_version: null,
      is_genuine: true,
      is_local_atlas: false,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: streamUri,
    };
    expect(
      getConnectExtraInfo(
        streamUri,
        BUILD_INFO,
        null,
        {
          s: {
            credentials: {
              mechanism: 'LDAP',
            },
            servers: new Map().set(
              'atlas-stream-67b8e1cd6d60357be377be7b-1dekw.virginia-usa.a.query.mongodb-dev.net',
              {
                description: {
                  address:
                    'atlas-stream-67b8e1cd6d60357be377be7b-1dekw.virginia-usa.a.query.mongodb-dev.net',
                },
              }
            ),
          },
        },
        false
      )
    ).to.deep.equal(output);
  });

  it('reports correct information when an empty uri is passed', function () {
    const output = {
      is_atlas: false,
      is_atlas_url: false,
      is_localhost: true,
      is_do_url: false,
      server_version: '3.2.0-rc2',
      is_enterprise: true,
      auth_type: 'LDAP',
      is_data_federation: false,
      is_stream: false,
      dl_version: null,
      atlas_version: null,
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      server_arch: 'x86_64',
      node_version: process.version,
      server_os: 'osx',
      uri: '',
      is_local_atlas: true,
    };
    expect(
      getConnectExtraInfo(
        '',
        BUILD_INFO,
        null,
        {
          s: {
            credentials: {
              mechanism: 'LDAP',
            },
            servers: new Map().set('localhost', {
              description: { address: 'localhost' },
            }),
          },
        },
        true
      )
    ).to.deep.equal(output);
  });

  it('does not fail when buildInfo is unavailable', function () {
    const output = {
      is_atlas: false,
      is_atlas_url: false,
      is_localhost: false,
      is_do_url: false,
      server_version: undefined,
      is_enterprise: false,
      auth_type: 'LDAP',
      is_data_federation: false,
      is_stream: false,
      dl_version: null,
      atlas_version: null,
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      server_arch: null,
      node_version: process.version,
      server_os: null,
      uri: '',
      is_local_atlas: false,
    };
    expect(
      getConnectExtraInfo(
        '',
        null,
        null,
        {
          s: {
            credentials: {
              mechanism: 'LDAP',
            },
          },
        },
        false
      )
    ).to.deep.equal(output);
  });

  describe('getHostnameForConnection', function () {
    it('handels hostname without port', function () {
      const hostname = getHostnameForConnection({
        s: {
          credentials: {
            mechanism: 'LDAP',
          },
          servers: new Map().set(
            'test-000-shard-00-00.test.mongodb.net:27017',
            {
              description: {
                address: 'test-000-shard-00-00.test.mongodb.net:27017',
              },
            }
          ),
        },
      });
      expect(hostname).to.be.eql('test-000-shard-00-00.test.mongodb.net');
    });

    it('handels IPv6 hostname without port', function () {
      const hostname = getHostnameForConnection({
        s: {
          credentials: {
            mechanism: 'LDAP',
          },
          servers: new Map().set('[3fff:0:a88:15a3::ac2f]:8001', {
            description: { address: '[3fff:0:a88:15a3::ac2f]:8001' },
          }),
        },
      });
      expect(hostname).to.be.eql('3fff:0:a88:15a3::ac2f');
    });
  });
});
