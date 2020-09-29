import BuildVariant from './build-variant';
import childProcess from 'child_process';
import gunzip from 'gunzip-maybe';
import Platform from './platform';
import fetch from 'node-fetch';
import tmp from 'tmp-promise';
import Config from './config';
import stream from 'stream';
import fs from 'fs-extra';
import tar from 'tar-fs';
import util from 'util';
import path from 'path';

const pipeline = util.promisify(stream.pipeline);
const execFile = util.promisify(childProcess.execFile);

const LATEST_CURATOR =
  'https://s3.amazonaws.com/boxes.10gen.com/build/curator/curator-dist-ubuntu1604-latest.tar.gz';

// make sure everything written in /tmp is cleared if an uncaught exception occurs
tmp.setGracefulCleanup();

/**
 * Distro enum to be used when making a curator call.
 */
enum Distro {
  Ubuntu = 'ubuntu1804',
  Debian = 'debian10',
  Redhat = 'rhel80'
}

/**
 * Target arch enum to be used when making a curator call.
 *
 * If we were to target a different arch for these distros, make sure
 * config/repo-config.yml and packages/build/src/tarball.ts are changed accordingly.
 *
 * This can be also moved to /config/build.conf.js in the future.
 */
enum Arch {
  Ubuntu = 'amd64',
  Debian = 'amd64',
  Redhat = 'x86_64',
}

export class Barque {
  private config: Config;
  private mongodbEdition: string;
  private mongodbVersion: string;

  constructor(config: Config) {
    this.config = config;
    // hard code mongodb edition to 'org' for now
    this.mongodbEdition = 'org';
    // linux mongodb versions to release to. This should perhaps be an array of
    // [4.3.0, 4.4.0], like mongo-tools
    this.mongodbVersion = '4.4.0';
  }

  /**
   * Upload current package to barque, MongoDB's PPA for linux distros.
   *
   * @param {string} tarballURL- The uploaded to Evergreen tarball URL.
   * @param {Config} config - Config object.
   *
   * @returns {Promise} The promise.
   */
  async releaseToBarque(tarballURL: string): Promise<any> {
    const repoConfig = path.join(this.config.rootDir, 'config', 'repo-config.yml');
    const curatorDirPath = await this.createCuratorDir();
    await this.extractLatestCurator(curatorDirPath);

    if (this.config.platform === Platform.Linux) {
      try {
        await this.execCurator(curatorDirPath, tarballURL, repoConfig);
      } catch (error) {
        throw new Error(`Curator is unable to upload to barque ${error}`);
      }
    }

    return;
  }

  /**
   * Run the child_process.exec to run curator command.
   *
   * @param {string} curatorDir - Path to freshly downloaded curator.
   * @param {string} tarballURL- The uploaded to Evergreen tarball URL.
   * @param {string} repoConfig - Path to repo-config.yml used to uplaod assets
   * to appropriate distros.
   *
   * @returns {Promise} The promise.
   */
  async execCurator(
    curatorDirPath: string,
    tarballURL: string,
    repoConfig: string): Promise<any> {
    return await execFile(
      `${curatorDirPath}/curator`, [
        '--level', 'debug',
        'repo', 'submit',
        '--service', 'https://barque.corp.mongodb.com',
        '--config', repoConfig,
        '--distro', this.determineDistro(this.config.buildVariant),
        '--arch', this.determineArch(this.config.buildVariant),
        '--edition', this.mongodbEdition,
        '--version', this.mongodbVersion,
        '--packages', tarballURL
      ], {
      // curator looks for these options in env
        env: {
          NOTARY_KEY_NAME: 'server-4.4',
          NOTARY_TOKEN: process.env.SIGNING_AUTH_TOKEN_44,
          BARQUE_API_KEY: process.env.BARQUE_API_KEY,
          BARQUE_USERNAME: process.env.BARQUE_USERNAME
        }
      });
  }

  /**
   * Determine the current arch to be passed on to curator given current build
   * variant.
   *
   * @param {string} variant - Current build variant.
   *
   * @returns {string} Arch to be passed as an argument to curator
   */
  determineArch(variant: string): string {
    // we can't use distro_id from evergreen's env variables, since those
    // sometimes come with other attributes like -test -large -small, and are not
    // valid distros for barque.
    if (variant === BuildVariant.Linux) return Arch.Ubuntu;
    if (variant === BuildVariant.Debian) return Arch.Debian;
    if (variant === BuildVariant.Redhat) return Arch.Redhat;

    return Arch.Ubuntu;
  }
  /**
   * Determine the current distro to be passed on to curator given current build
   * variant.
   *
   * @param {string} variant - Current build variant.
   *
   * @returns {string} Distro to be passed as an argument to curator
   */
  determineDistro(variant: string): string {
    // we can't use distro_id from evergreen's env variables, since those
    // sometimes come with other attributes like -test -large -small, and are not
    // valid distros for barque.
    if (variant === BuildVariant.Linux) return Distro.Ubuntu;
    if (variant === BuildVariant.Debian) return Distro.Debian;
    if (variant === BuildVariant.Redhat) return Distro.Redhat;

    return Distro.Ubuntu;
  }

  /**
   * Create a staging dir in /tmp to download the latest version of curator.
   *
   * @returns {Promise} Staging directory path.
   */
  async createCuratorDir(): Promise<any> {
    const dir = await tmp.dir({ prefix: 'curator-', unsafeCleanup: true });
    fs.ensureDir(dir.path, '0755');

    return dir.path;
  }

  /**
   * Fetch, unzip, and un-tar the latest version of curator. Then write it to
   * previoiusly created /tmp staging directory.
   *
   * @param {string} dest - Destination to write the un-packaged curator
   * executable.
   *
   * @returns {Promise} Written binary in the given location.
   *
   * Debian and Ubuntu Build Variants' curator errors out on `execFile`, to make
   * sure this functionality works as expected, download the latest curator.
   *
   */
  async extractLatestCurator(dest: string): Promise<any> {
    const response = await fetch(LATEST_CURATOR);
    if (response.ok) {
      return pipeline(
        response.body,
        gunzip(),
        tar.extract(dest)
      );
    }
  }
}
