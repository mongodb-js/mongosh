'use strict';

const path = require('path');
const os = require('os');

const SHARED_LIBRARY_SUFFIX =
  (process.env.PACKAGE_VARIANT ?? process.platform).startsWith('win32') ? 'dll' :
  (process.env.PACKAGE_VARIANT ?? process.platform).startsWith('darwin') ? 'dylib' : 'so';

/**
 * The project root.
 */
const ROOT = path.join(__dirname, '..');

/**
 * The tmp folder location.
 */
 const TMP_DIR = path.join(ROOT, 'tmp');

/**
 * The mongosh package.
 */
const CLI_REPL_DIR = path.join(ROOT, 'packages', 'cli-repl');

/**
 * The project config.
 */
const CLI_REPL_PACKAGE_JSON = require(path.join(CLI_REPL_DIR, 'package.json'));

/**
 * The file to which the bundled output is written, which is used as the input
 * for creating the standalone executable.
 */
const BUNDLE_SINGLEFILE_OUTPUT = path.join(CLI_REPL_DIR, 'dist', 'mongosh.js');

/**
 * The output dir for the build.
 */
const OUTPUT_DIR = path.join(ROOT, 'dist');

/**
 * The name of the generated mongosh executable.
 */
const EXECUTABLE_PATH = path.join(OUTPUT_DIR, process.platform === 'win32' ? 'mongosh.exe' : 'mongosh');

/**
 * The path to the downloaded csfe shared library.
 * We use the name mongosh_crypt_v1 to avoid conflicts with users
 * potentially installing the 'proper' crypt shared library.
 */
const CRYPT_LIBRARY_PATH = path.resolve(OUTPUT_DIR, 'mongosh_crypt_v1.' + SHARED_LIBRARY_SUFFIX);

/**
 * Build info JSON data file.
 */
const BUILD_INFO_FILE_PATH = path.join(CLI_REPL_DIR, 'lib', 'build-info.json');

/**
 * The SHA for the current git HEAD.
 */
const REVISION = process.env.GITHUB_COMMIT ?? process.env.REVISION;

/**
 * The copyright notice for debian packages and .exe files
 */
const COPYRIGHT = `${new Date().getYear() + 1900} MongoDB, Inc.`;

/**
 * The manual page file name
 */
const MANPAGE_NAME = 'mongosh.1.gz'

/**
 * The package identifier (not executable identifier), e.g. 'debian-x64-openssl11'.
 */
const PACKAGE_VARIANT = process.env.PACKAGE_VARIANT;

const CTA_CONFIG = require(path.join(ROOT, 'config', 'cta-config.json'));

const CTA_CONFIG_SCHEMA = require(path.join(ROOT, 'config', 'cta-config.schema.json'));

/**
 * Export the configuration for the build.
 */
module.exports = {
  version: CLI_REPL_PACKAGE_JSON.version,
  rootDir: ROOT,
  bundleSinglefileOutput: BUNDLE_SINGLEFILE_OUTPUT,
  executablePath: EXECUTABLE_PATH,
  outputDir: OUTPUT_DIR,
  buildInfoFilePath: BUILD_INFO_FILE_PATH,
  executableOsId: process.env.EXECUTABLE_OS_ID,
  project: process.env.PROJECT,
  revision: REVISION,
  branch: process.env.BRANCH_NAME,
  evgAwsKey: process.env.AWS_KEY,
  evgAwsSecret: process.env.AWS_SECRET,
  downloadCenterAwsKey: process.env.DOWNLOAD_CENTER_AWS_KEY,
  downloadCenterAwsSecret: process.env.DOWNLOAD_CENTER_AWS_SECRET,
  downloadCenterAwsKeyNew: process.env.DOWNLOAD_CENTER_AWS_KEY_NEW,
  downloadCenterAwsSecretNew: process.env.DOWNLOAD_CENTER_AWS_SECRET_NEW,
  downloadCenterAwsSessionTokenNew: process.env.DOWNLOAD_CENTER_AWS_SESSION_TOKEN_NEW,
  injectedJsonFeedFile: path.join(ROOT, 'config', 'mongosh-versions.json'),
  githubToken: process.env.GITHUB_TOKEN,
  segmentKey: process.env.SEGMENT_API_KEY,
  isCi: process.env.IS_CI === 'true',
  isPatch: process.env.IS_PATCH === 'true',
  triggeringGitTag: process.env.TRIGGERED_BY_GIT_TAG,
  platform: os.platform(),
  execNodeVersion: process.env.NODE_JS_VERSION || `^${process.version.slice(1)}`,
  packageVariant: PACKAGE_VARIANT,
  notarySigningKeyName: process.env.NOTARY_SIGNING_KEY_NAME,
  notaryAuthToken: process.env.NOTARY_AUTH_TOKEN,
  repo: {
    owner: 'mongodb-js',
    repo: 'mongosh'
  },
  artifactUrlFile: process.env.ARTIFACT_URL_FILE,
  artifactUrlExtraTag: process.env.ARTIFACT_URL_EXTRA_TAG,
  cryptSharedLibPath: CRYPT_LIBRARY_PATH,
  packageInformation: packageVariant => {
    // The shared-openssl suffix for the current package identifer, e.g. 'openssl11'.
    const SHARED_OPENSSL_TAG = packageVariant?.match?.(/-(openssl\d*)$/)?.[1] || '';

    return {
      binaries: [
        {
          sourceFilePath: EXECUTABLE_PATH,
          category: 'bin',
          license: {
            sourceFilePath: path.resolve(__dirname, '..', 'LICENSE'),
            packagedFilePath: 'LICENSE-mongosh',
            debCopyright: `${new Date().getYear() + 1900} MongoDB, Inc.`,
            debIdentifier: 'Apache-2',
            rpmIdentifier: 'ASL 2.0'
          }
        },
        {
          sourceFilePath: CRYPT_LIBRARY_PATH,
          category: 'lib',
          license: {
            sourceFilePath: path.resolve(__dirname, '..', 'packaging', 'LICENSE-crypt-library'),
            packagedFilePath: 'LICENSE-crypt-library',
            debCopyright: COPYRIGHT,
            debIdentifier: 'Proprietary',
            rpmIdentifier: 'Proprietary'
          }
        }
      ],
      otherDocFilePaths: [
        {
          sourceFilePath: path.resolve(__dirname, '..', 'packaging', 'README'),
          packagedFilePath: 'README'
        },
        {
          sourceFilePath: path.resolve(__dirname, '..', 'THIRD_PARTY_NOTICES.md'),
          packagedFilePath: 'THIRD_PARTY_NOTICES'
        },
        {
          sourceFilePath: path.resolve(path.dirname(EXECUTABLE_PATH), '.sbom.json'),
          packagedFilePath: '.sbom.json'
        },
      ],
      manpage: {
        sourceFilePath: path.resolve(TMP_DIR, 'manpage', MANPAGE_NAME),
        packagedFilePath: MANPAGE_NAME,
      },
      metadata: {
        name: 'mongosh',
        rpmName: 'mongodb-mongosh' + (SHARED_OPENSSL_TAG ? `-shared-${SHARED_OPENSSL_TAG}` : ''),
        debName: 'mongodb-mongosh' + (SHARED_OPENSSL_TAG ? `-shared-${SHARED_OPENSSL_TAG}` : ''),
        provides: [
          { name: 'mongodb-shell', version: '2.0' },
          ...(
            SHARED_OPENSSL_TAG ?
              [{ name: 'mongodb-mongosh', version: CLI_REPL_PACKAGE_JSON.version }] :
              []
          )
        ],
        debDepends: 'libc6 (>= 2.17)' + (
          SHARED_OPENSSL_TAG === 'openssl11' ? ', libssl1.1' :
            SHARED_OPENSSL_TAG === 'openssl3' ? ', libssl3' : ''
        ),
        debRecommends: 'libgssapi-krb5-2',
        fullName: 'MongoDB Shell',
        version: CLI_REPL_PACKAGE_JSON.version,
        description: CLI_REPL_PACKAGE_JSON.description,
        homepage: CLI_REPL_PACKAGE_JSON.homepage,
        maintainer: CLI_REPL_PACKAGE_JSON.author,
        manufacturer: CLI_REPL_PACKAGE_JSON.manufacturer,
        copyright: COPYRIGHT,
        icon: path.resolve(__dirname, '..', 'packaging', 'mongo.ico')
      },
      debTemplateDir: path.resolve(__dirname, '..', 'packaging', 'deb-template'),
      rpmTemplateDir: path.resolve(__dirname, '..', 'packaging', 'rpm-template'),
      msiTemplateDir: path.resolve(__dirname, '..', 'packaging', 'msi-template')
    };
  },
  manpage: {
    sourceUrl: 'https://www.mongodb.com/docs/mongodb-shell/manpages.tar.gz',
    downloadPath: path.resolve(TMP_DIR, 'manpage'),
    fileName: MANPAGE_NAME,
  },
  ctaConfig: CTA_CONFIG,
  ctaConfigSchema: CTA_CONFIG_SCHEMA,
};
