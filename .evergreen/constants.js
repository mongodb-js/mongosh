// @ts-check

exports.PLATFORMS = ['darwin', 'linux', 'win32'];

exports.platformToDetails = {
  darwin: {
    displayName: 'MacOS 14 arm64',
    runOn: 'macos-14-arm64',
    executableOsId: 'darwin-arm64',
  },
  linux: {
    displayName: 'Ubuntu 20.04 x64',
    runOn: 'ubuntu2004-small',
    executableOsId: 'darwin-arm64',
    tags: ['nightly-driver'],
  },
  win32: {
    displayName: 'Windows',
    runOn: 'windows-2022-small',
    executableOsId: 'win32',
  },
};

const NODE_JS_VERSION_24 = require('./node-24-latest.json').version;
exports.NODE_JS_VERSION_24 = NODE_JS_VERSION_24;

exports.MONGODB_VERSIONS = [
  { shortName: '44xc', versionSpec: '4.4.x' },
  { shortName: '44xe', versionSpec: '4.4.x-enterprise' },
  { shortName: '50xc', versionSpec: '5.0.x' },
  { shortName: '50xe', versionSpec: '5.0.x-enterprise' },
  { shortName: '60xc', versionSpec: '6.0.x' },
  { shortName: '60xe', versionSpec: '6.0.x-enterprise' },
  { shortName: '70xc', versionSpec: '7.0.x' },
  { shortName: '70xe', versionSpec: '7.0.x-enterprise' },
  { shortName: '80xc', versionSpec: '8.0.x' },
  { shortName: '80xe', versionSpec: '8.0.x-enterprise' },
  { shortName: '83xc', versionSpec: '8.3.x' },
  { shortName: '83xe', versionSpec: '8.3.x-enterprise' },
  {
    shortName: '90xc',
    versionSpec: '9.0.0-rc4',
    // 9.0 release candidates are only published to cloud.json, not the
    // default full.json feed that mongodb-download-url resolves against.
    versionListUrl: 'https://downloads.mongodb.org/cloud.json',
  },
  {
    shortName: '90xe',
    versionSpec: '9.0.0-rc4-enterprise',
    versionListUrl: 'https://downloads.mongodb.org/cloud.json',
  },
  { shortName: 'latest', versionSpec: 'latest-alpha-enterprise' },
];

exports.NODE_VERSIONS = [
  {
    shortName: '24',
    versionSpec: NODE_JS_VERSION_24,
    skipNodeVersionCheck: '',
    optional: false,
  },
];
