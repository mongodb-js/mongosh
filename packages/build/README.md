# The Mongo Shell Build System

[Evergreen Build][evergreen-url]

This package contains all the tools needed to build and release mongosh.

Build process is done on [Evergreen][evergreen-url] and is triggered with every commit.
Releases are triggered by a git tag when ran with `npm run publish-npm` from the
root of the project.

Current build and release flow is as follows:

- `npm run evergreen-release package
  - A commit triggers an evergreen build based on currently available build
    variants: MacOS, Windows, Linux, Debian, and RedHat.
  - MacOS, Linux and Windows run three tasks: check, test, and release. Debian and
    Redhat run two tasks: check and release. Debian and Redhat also depend on
    tests to pass on Linux.
  - Identical bundle and binary are built on all five variants.
  - Each variant creates its own tarball (`.zip`, `.tgz`, `.deb`, `.rpm`). Type of
    tarball is determined by the current build variant.
  - Each variant uploads its own tarball to Evergreen’s AWS.
  - MacOS build variant uploads config file with information about the new version
    for each platform to Downloads Centre. This only happens on a tagged commit.
  - MacOS build variant creates a github release. This only happens on a tagged
    commit.
  - The five build variants run in parallel.
- `npm run evergreen-release publish`
  - All the previous build steps succeeded.
  - A separate MacOS build variant (darwin_publish_release) uploads config file with information about the new version for each platform to Downloads Centre. This only happens on a tagged commit.
  - A separate MacOS build variant (darwin_publish_release) promotes the draft github release to public. This only happens on a tagged commit.

![build flow][build-img]

## Usage

```js
const release = require('@mongosh/build');

const config = {
  version: '0.0.1',
  bundleId: 'bundleId',
  input: 'input',
  execInput: 'execInput',
  outputDir: 'outputDir',
  analyticsConfig: 'analyticsConfig',
  project: 'project',
  revision: 'revision',
  branch: 'branch',
  evgAwsKey: 'evgAwsKey',
  evgAwsSecret: 'evgAwsSecret',
  downloadCenterAwsKey: 'downloadCenterAwsKey',
  downloadCenterAwsSecret: 'downloadCenterAwsSecret',
  githubToken: 'githubToken',
  segmentKey: 'segmentKey',
  appleUser: 'appleUser',
  applePassword: 'applePassword',
  appleAppIdentity: 'appleAppIdentity',
  isCi: true,
  platform: 'platform',
  buildVariant: 'linux',
  repo: {
    owner: 'owner',
    repo: 'repo',
  },
  dryRun: false
}

const command = 'package'; // or 'publish'

const runRelease = async() => {
  await release(command, config);
};

runRelease().then(() => {
  process.exit(0);
});
```

### API
#### await release(command, config)
Run a complete release of mongosh. This will bundle, create the binary and
package a tarball for the current build variant. Running a release requires a
config object which is usually obtained from evergreen. For current config, see
[build.conf.js][build-url]

__config:__ config object necessary for release.

```js
const release = require('@mongosh/build');
const configObject = {};
await release(command, config);
```

If `config.dryRun` is set, this will only package a tarball and skip all later
steps.

#### await compileExec()
Create a compiled down binary. Binary is created for the provided platform (e.g.
windows will build `mongosh.exe`). Before we compile the binary, we bundle
`execInput` into a single `.js` file.

__input:__ path to build input.
__execInput:__ path to compiled executive input.
__outputDir:__ path to where the compiled binary will live.
__platform:__  platform to run `compileExec` on. `linux`, `darwin`, and `win32`
are accepted options.
__analyticsConfig:__ path to analytics config for telemetry.
__segmentKey:__ segment api key for telemetry.

```js
const compileexec = require('@mongosh/build').compileexec;

const config = {
  input: 'path/to/input',
  execInput: 'path/to/exec/input',
  outputDir: 'path/to/output/directory',
  analyticsConfig: 'path/to/analytics/config',
  segmentKey: 'SEGMENT_API_KEY_23481k',
}
await compileExec(
  config.input,
  config.execInput,
  config.outputDir,
  os.platform(),
  config.analyticsConfig,
  config.segmentKey
);
```
#### createDownloadCenterConfig()
Output Download Centre config json given a particular version. This json is sent
over to Mongodb Downloads Centre to notify of updated package versions.

__version:__ version of the current package to update.

```js
const createDownloadCenterConfig = require('@mongosh/build').createDownloadCenterConfig;

const downloadCentreConfig = createDownloadCenterConfig('1.3.2')
```


#### await createTarball(input, outputDir, buildVariant, version, rootDir)
Creates a tarball for a given binary and build variant. Different build variants
will create different tarballs - `.tgz`, `.zip`, or `.deb`.

__input:__ path to binary file.
__outputDir:__ path to where the compiled tarball will live.
__buildVariant:__ build variant to create a tarball for. `macos`, `ubuntu`, `windows_ps , or `debian`  are currently available.
__version:__ version for the tarball.
__rootDir:__ path to root project directory.
```js
const tarball = require('@mongosh/build').tarball;

const executable = 'path/to/executable'
const config = {
  outputDir: 'path/to/output/directory',
  buildVariant: 'windows_ps',
  version: '0.2.0',
  rootDir: 'path/to/root/directory',
}

const artifact = await createTarball(
  executable,
  config.outputDir,
  config.buildVariant,
  config.version,
  config.rootDir
);
```

## Installation
```shell
npm install --save @mongosh/build
```

[evergreen-url]: https://evergreen.mongodb.com/waterfall/mongosh
[config-url]: https://github.com/mongodb-js/mongosh/blob/393b505c179b64fbb72e0481c63f1723a3c56f06/config/build.conf.js
[build-img]: ./build.png
