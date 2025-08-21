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
    runOn: 'windows-vsCurrent-small',
    executableOsId: 'win32',
  },
};

const NODE_JS_VERSION_20 = require('./node-20-latest.json').version;
exports.NODE_JS_VERSION_20 = NODE_JS_VERSION_20;

exports.MONGODB_VERSIONS = [
  { shortName: '42xc', versionSpec: '4.2.x' },
  { shortName: '42xe', versionSpec: '4.2.x-enterprise' },
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
  { shortName: '82rc', versionSpec: '8.2.0-rc4' },
  { shortName: '82rce', versionSpec: '8.2.0-rc4-enterprise' },
  { shortName: 'latest', versionSpec: 'latest-alpha-enterprise' },
];

exports.NODE_VERSIONS = [
  {
    shortName: '20',
    versionSpec: NODE_JS_VERSION_20,
    skipNodeVersionCheck: '',
  },
];
