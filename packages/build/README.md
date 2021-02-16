# The Mongo Shell Build System

[Evergreen Build][evergreen-url]

This package contains all the tools needed to build and release mongosh.

Build process is done on [Evergreen][evergreen-url] and is triggered with every commit.
Releases are triggered by a git tag when ran with `npm run publish-npm` from the
root of the project.

For full details on how to run a release, check in with [`compass-internal
-docs`](https://github.com/10gen/compass-internal-docs/blob/master/technical/mongosh/mongosh-release.md) repo.

Current build and release flow is as follows:

### `npm run evergreen-release package`
- A commit triggers an evergreen build based on currently available build
  variants: MacOS, Windows, Linux, Debian, and RedHat.
- MacOS, Linux and Windows run three tasks: check, test, and release. Debian and
  Redhat run two tasks: check and release. Debian and Redhat also depend on
  tests to pass on Linux.
- Identical bundle and binary are built on all five variants.
- MacOS binary is signed and notarized.
- Each variant creates its own archive (`.zip`, `.tgz`, `.deb`, `.rpm`). Type of
  archive is determined by the current build variant.
- Each variant uploads its own tarball to Evergreen’s AWS.
- Linux build variants upload their artifacts to `barque` using
  [`curator`](https://github.com/mongodb/curator) to be used with MongoDB's PPA. The uploaded packages can be found under the following URLs:
  1. Ubuntu: https://repo.mongodb.org/apt/ubuntu/dists/bionic/mongodb-org/4.4/multiverse/binary-amd64/
  2. Redhat: https://repo.mongodb.org/yum/redhat/8Server/mongodb-org/4.4/x86_64/RPMS/
  3. Debian: https://repo.mongodb.org/apt/debian/dists/buster/mongodb-org/4.4/main/binary-amd64/
- The five build variants run in parallel.
### `npm run evergreen-release publish`
- All the previous build steps succeeded.
- A separate MacOS build variant (darwin_publish_release) uploads config file
  with information about the new version for each platform to Downloads Centre.
This only happens on a tagged commit.
- A separate MacOS build variant (darwin_publish_release) promotes the draft
  github release to public. This only happens on a tagged commit.

![build flow][build-img]

## Usage

```js
const release = require('@mongosh/build');

const config = {
  version: '0.0.1',
  appleNotarizationBundleId: 'appleNotarizationBundleId',
  input: 'input',
  execInput: 'execInput',
  outputDir: 'outputDir',
  analyticsConfigFilePath: 'analyticsConfigFilePath',
  project: 'project',
  revision: 'revision',
  branch: 'branch',
  evgAwsKey: 'evgAwsKey',
  evgAwsSecret: 'evgAwsSecret',
  downloadCenterAwsKey: 'downloadCenterAwsKey',
  downloadCenterAwsSecret: 'downloadCenterAwsSecret',
  githubToken: 'githubToken',
  segmentKey: 'segmentKey',
  appleNotarizationUsername: 'appleNotarizationUsername',
  appleNotarizationApplicationPassword: 'appleNotarizationApplicationPassword',
  appleCodesignIdentity: 'appleCodesignIdentity',
  isCi: true,
  platform: 'platform',
  distributionBuildVariant: 'linux',
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

#### await runCompile()
Create a compiled down binary. Binary is created for the provided platform (e.g.
windows will build `mongosh.exe`). Before we compile the binary, we bundle
`execInput` into a single `.js` file.

__input:__ path to build input.
__execInput:__ path to compiled executive input.
__outputDir:__ path to where the compiled binary will live.
__platform:__  platform to run `runCompile` on. `linux`, `darwin`, and `win32`
are accepted options.
__analyticsConfig:__ path to analytics config for telemetry.
__segmentKey:__ segment api key for telemetry.

```js
const compileexec = require('@mongosh/build').compileexec;

const config = {
  input: 'path/to/input',
  execInput: 'path/to/exec/input',
  outputDir: 'path/to/output/directory',
  analyticsConfigFilePath: 'path/to/analytics/config',
  segmentKey: 'SEGMENT_API_KEY_23481k',
}
await runCompile(
  config.input,
  config.execInput,
  config.outputDir,
  os.platform(),
  config.analyticsConfigFilePath,
  config.segmentKey
);
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
  distributionBuildVariant: 'windows_ps',
  version: '0.2.0',
  rootDir: 'path/to/root/directory',
}

const artifact = await createTarball(
  executable,
  config.outputDir,
  config.distributionBuildVariant,
  config.version,
  config.rootDir
);
```

[evergreen-url]: https://evergreen.mongodb.com/waterfall/mongosh
[config-url]: https://github.com/mongodb-js/mongosh/blob/393b505c179b64fbb72e0481c63f1723a3c56f06/config/build.conf.js
[build-img]: ./build.png
