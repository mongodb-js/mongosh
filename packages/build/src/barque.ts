import childProcess from 'child_process';
import fs from 'fs-extra';
import gunzip from 'gunzip-maybe';
import fetch from 'node-fetch';
import path from 'path';
import stream from 'stream';
import tar from 'tar-fs';
import tmp from 'tmp-promise';
import util, { promisify } from 'util';
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
  public static readonly PPA_REPO_BASE_URL = 'https://repo.mongodb.org' as const;

  private config: Config;
  private mongodbEdition: string;
  private mongodbVersion: string;

  constructor(config: Config) {
    if (config.platform !== Platform.Linux) {
      throw new Error('Barque publishing is only supported on linux platforms');
    }

    this.config = config;
    // hard code mongodb edition to 'org' for now
    this.mongodbEdition = 'org';
    // linux mongodb versions to release to. This should perhaps be an array of
    // [4.3.0, 4.4.0], like mongo-tools
    this.mongodbVersion = '4.4.0';
  }

  /**
   * Upload a distributable package to barque, MongoDB's PPA for linux distros.
   *
   * Note that this method returns the URLs where the packages _will_ be available.
   * This method does not wait for the packages to really be available.
   * Use `waitUntilPackagesAreAvailable` for this purpose.
   *
   * @param buildVariant - The distributable package build variant to publish.
   * @param packageUrl - The Evergreen URL of the distributable package.
   *
   * @returns The URLs where the packages will be available.
   */
  async releaseToBarque(buildVariant: BuildVariant, packageUrl: string): Promise<string[]> {
    const repoConfig = path.join(this.config.rootDir, 'config', 'repo-config.yml');
    const curatorDirPath = await this.createCuratorDir();
    await this.extractLatestCurator(curatorDirPath);

    const targetDistros = this.getTargetDistros(buildVariant);
    const targetArchitecture = this.getTargetArchitecture(buildVariant);

    const publishedPackageUrls: string[] = [];
    for (const distro of targetDistros) {
      try {
        await this.execCurator(
          curatorDirPath,
          packageUrl,
          repoConfig,
          distro,
          targetArchitecture
        );
      } catch (error) {
        console.error('Curator failed', error);
        throw new Error(`Curator is unable to upload to barque ${error}`);
      }

      publishedPackageUrls.push(this.computePublishedPackageUrl(distro, targetArchitecture, packageUrl));
    }
    return publishedPackageUrls;
  }

  async execCurator(
    curatorDirPath: string,
    packageUrl: string,
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
        '--packages', packageUrl
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
      case 'debian-x64':
        return Arch.Amd64;
      case 'rhel-x64':
        return Arch.X86_64;
      default:
        throw new Error('Unsupported variant for Barque publishing: ' + variant);
    }
  }

  getTargetDistros(variant: BuildVariant): Distro[] {
    switch (variant) {
      case 'debian-x64':
        return [
          Distro.Debian10,
          Distro.Ubuntu1804,
          Distro.Ubuntu2004
        ];
      case 'rhel-x64':
        return [
          Distro.Redhat80
        ];
      default:
        throw new Error('Unsupported variant for Barque publishing: ' + variant);
    }
  }

  computePublishedPackageUrl(distro: Distro, targetArchitecture: Arch, packageUrl: string): string {
    const packageFileName = packageUrl.split('/').slice(-1);
    const packageFolderVersion = this.mongodbVersion.split('.').slice(0, 2).join('.');
    switch (distro) {
      case Distro.Debian10:
        return `${Barque.PPA_REPO_BASE_URL}/apt/debian/dists/buster/mongodb-org/${packageFolderVersion}/main/binary-${targetArchitecture}/${packageFileName}`;
      case Distro.Ubuntu1804:
        return `${Barque.PPA_REPO_BASE_URL}/apt/ubuntu/dists/bionic/mongodb-org/${packageFolderVersion}/multiverse/binary-${targetArchitecture}/${packageFileName}`;
      case Distro.Ubuntu2004:
        return `${Barque.PPA_REPO_BASE_URL}/apt/ubuntu/dists/focal/mongodb-org/${packageFolderVersion}/multiverse/binary-${targetArchitecture}/${packageFileName}`;
      case Distro.Redhat80:
        return `${Barque.PPA_REPO_BASE_URL}/yum/redhat/8/mongodb-org/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      default:
        throw new Error(`Unsupported distro: ${distro}`);
    }
  }

  /**
   * Waits until the given packages are available under the specified URLs or throws an error if there
   * are still remaining packages after the timeout.
   *
   * Note that the method will try all URLs at least once after an initial delay of `sleepTimeSeconds`.
   */
  async waitUntilPackagesAreAvailable(publishedPackageUrls: string[], timeoutSeconds: number, sleepTimeSeconds = 10): Promise<void> {
    let remainingPackages = [...publishedPackageUrls];
    const sleep = promisify(setTimeout);

    const startMs = new Date().getTime();
    const failOnTimeout = () => {
      if (new Date().getTime() - startMs > timeoutSeconds * 1000) {
        throw new Error(`Barque timed out - the following packages are still not available: ${remainingPackages.join(', ')}`);
      }
    };

    while (remainingPackages.length) {
      console.info(`Waiting for availability of:\n - ${remainingPackages.join('\n - ')}`);
      await sleep(sleepTimeSeconds * 1000);

      const promises = remainingPackages.map(async url => await fetch(url, {
        method: 'HEAD'
      }));
      const responses = await Promise.all(promises);

      const newRemainingPackages: string[] = [];
      for (let i = 0; i < remainingPackages.length; i++) {
        if (responses[i].status !== 200) {
          newRemainingPackages.push(remainingPackages[i]);
        }
      }
      remainingPackages = newRemainingPackages;

      failOnTimeout();
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
