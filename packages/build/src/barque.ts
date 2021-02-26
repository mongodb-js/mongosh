import childProcess from 'child_process';
import fs from 'fs-extra';
import gunzip from 'gunzip-maybe';
import fetch from 'node-fetch';
import path from 'path';
import stream from 'stream';
import tar from 'tar-fs';
import tmp from 'tmp-promise';
import util from 'util';
import { BuildVariant, Config, Platform } from './config';

const pipeline = util.promisify(stream.pipeline);
const execFile = util.promisify(childProcess.execFile);

export const LATEST_CURATOR =
  'https://s3.amazonaws.com/boxes.10gen.com/build/curator/curator-dist-ubuntu1604-latest.tar.gz';

// make sure everything written in /tmp is cleared if an uncaught exception occurs
tmp.setGracefulCleanup();

/**
 * Distro enum to be used when making a curator call.
 */
enum Distro {
  Ubuntu1804 = 'ubuntu1804',
  Ubuntu2004 = 'ubuntu2004',
  Debian10 = 'debian10',
  Redhat80 = 'rhel80'
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
  Amd64 = 'amd64',
  X86_64 = 'x86_64'
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
  async releaseToBarque(buildVariant: BuildVariant, tarballURL: string): Promise<any> {
    if (this.config.platform !== Platform.Linux) {
      return;
    }

    const repoConfig = path.join(this.config.rootDir, 'config', 'repo-config.yml');
    const curatorDirPath = await this.createCuratorDir();
    await this.extractLatestCurator(curatorDirPath);

    const targetDistros = this.getTargetDistros(buildVariant);
    const targetArchitecture = this.getTargetArchitecture(buildVariant);
    for (const distro of targetDistros) {
      try {
        await this.execCurator(
          curatorDirPath,
          tarballURL,
          repoConfig,
          distro,
          targetArchitecture
        );
      } catch (error) {
        console.error('Curator failed', error);
        throw new Error(`Curator is unable to upload to barque ${error}`);
      }
    }
  }

  async execCurator(
    curatorDirPath: string,
    tarballURL: string,
    repoConfig: string,
    distro: Distro,
    architecture: Arch
  ): Promise<any> {
    return await execFile(
      `${curatorDirPath}/curator`, [
        '--level', 'debug',
        'repo', 'submit',
        '--service', 'https://barque.corp.mongodb.com',
        '--config', repoConfig,
        '--distro', distro,
        '--arch', architecture,
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

  getTargetArchitecture(variant: BuildVariant): Arch {
    switch (variant) {
      case BuildVariant.Debian:
        return Arch.Amd64;
      case BuildVariant.Redhat:
        return Arch.X86_64;
      default:
        throw new Error('Unsupported variant for Barque publishing: ' + variant);
    }
  }

  getTargetDistros(variant: BuildVariant): Distro[] {
    switch (variant) {
      case BuildVariant.Debian:
        return [
          Distro.Debian10,
          Distro.Ubuntu1804,
          Distro.Ubuntu2004
        ];
      case BuildVariant.Redhat:
        return [
          Distro.Redhat80
        ];
      default:
        throw new Error('Unsupported variant for Barque publishing: ' + variant);
    }
  }

  /**
   * Create a staging dir in /tmp to download the latest version of curator.
   *
   * @returns {Promise} Staging directory path.
   */
  async createCuratorDir(): Promise<any> {
    const dir = await tmp.dir({ prefix: 'curator-', unsafeCleanup: true });
    fs.ensureDir(dir.path, { mode: 0o755 });

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
