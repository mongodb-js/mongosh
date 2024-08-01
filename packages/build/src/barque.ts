import childProcess from 'child_process';
import { promises as fs } from 'fs';
import zlib from 'zlib';
import fetch from 'node-fetch';
import path from 'path';
import stream from 'stream';
import http from 'http';
import { once } from 'events';
import tar from 'tar-fs';
import tmp from 'tmp-promise';
import util, { promisify } from 'util';
import type { PackageVariant, Config } from './config';
import semver from 'semver';
import {
  getArch,
  getDistro,
  getDebArchName,
  getRPMArchName,
  Platform,
} from './config';
import { withRetries } from './helpers';
import type {
  PPARepository,
  SupportedServerVersion,
  PPARepositoryAndServerVersions,
} from './config/server-with-ppa';
import { getSupportedServersForPPAs } from './config/server-with-ppa';

const pipeline = util.promisify(stream.pipeline);
const execFile = util.promisify(childProcess.execFile);

export const LATEST_CURATOR =
  'https://s3.amazonaws.com/boxes.10gen.com/build/curator/curator-dist-ubuntu1604-latest.tar.gz';

// make sure everything written in /tmp is cleared if an uncaught exception occurs
tmp.setGracefulCleanup();

/**
 * Return the full list of [distro, arch] combinations that we upload for
 * a given package variant (where 'distro' refers to a distro in the package
 * repository, e.g. Ubuntu 20.04).
 *
 * /config/repo-config.yml needs to be kept in sync with this.
 */
export function getReposAndArch(packageVariant: PackageVariant): {
  ppas: PPARepositoryAndServerVersions[];
  arch: string;
} {
  switch (getDistro(packageVariant)) {
    case 'win32':
    case 'win32msi':
    case 'darwin':
    case 'linux':
      return { ppas: [], arch: '' };
    case 'deb':
      return {
        ppas: getSupportedServersForPPAs([
          'ubuntu1804',
          'ubuntu2004',
          'ubuntu2204',
          'ubuntu2404',
          'debian10',
          'debian11',
          'debian12',
        ]),
        arch: getDebArchName(getArch(packageVariant)),
      };
    case 'rpm':
      if (getArch(packageVariant) === 'x64') {
        return {
          ppas: getSupportedServersForPPAs([
            'rhel70',
            'rhel80',
            'rhel90',
            'amazon1',
            'amazon2',
            'amazon2023',
            'suse12',
            'suse15',
          ]),
          arch: getRPMArchName(getArch(packageVariant)),
        };
      }
      if (getArch(packageVariant) === 'arm64') {
        return {
          ppas: getSupportedServersForPPAs([
            'rhel80',
            'rhel90',
            'amazon2',
            'amazon2023',
          ]),
          arch: getRPMArchName(getArch(packageVariant)),
        };
      }
      if (
        getArch(packageVariant) === 'ppc64le' ||
        getArch(packageVariant) === 's390x'
      ) {
        return {
          ppas: getSupportedServersForPPAs(['rhel70', 'rhel80']),
          arch: getRPMArchName(getArch(packageVariant)),
        };
      }
      return { ppas: [], arch: '' };
    default:
      throw new Error(`Unknown package variant ${packageVariant}`);
  }
}

export class Barque {
  private config: Config;
  private mongodbEditions: string[];
  private serverVersionNotaryKeys: Record<
    SupportedServerVersion,
    {
      notaryKeyName: string;
      notaryToken: string;
    }
  >;
  private downloadedCuratorPromise: Promise<string> | undefined;

  constructor(config: Config) {
    if (config.platform !== Platform.Linux) {
      throw new Error('Barque publishing is only supported on linux platforms');
    }

    this.config = config;
    this.mongodbEditions = ['org', 'enterprise'];
    // linux mongodb versions to release to.
    this.serverVersionNotaryKeys = {
      '4.4.0': {
        notaryKeyName: 'server-4.4',
        notaryToken: process.env.SIGNING_AUTH_TOKEN_44 ?? '',
      },
      '5.0.0': {
        notaryKeyName: 'server-5.0',
        notaryToken: process.env.SIGNING_AUTH_TOKEN_50 ?? '',
      },
      '6.0.0': {
        notaryKeyName: 'server-6.0',
        notaryToken: process.env.SIGNING_AUTH_TOKEN_60 ?? '',
      },
      '7.0.0': {
        notaryKeyName: 'server-7.0',
        notaryToken: process.env.SIGNING_AUTH_TOKEN_70 ?? '',
      },
      '8.0.0': {
        notaryKeyName: 'server-8.0',
        notaryToken: process.env.SIGNING_AUTH_TOKEN_80 ?? '',
      },
    };
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
   * @param isDryRun - Whether to pass --dry-run to curator.
   *
   * @returns The URLs where the packages will be available.
   */
  async releaseToBarque(
    buildVariant: PackageVariant,
    packageUrl: string,
    isDryRun: boolean
  ): Promise<string[]> {
    const repoConfig = path.join(
      this.config.rootDir,
      'config',
      'repo-config.yml'
    );
    this.downloadedCuratorPromise ??= (async () => {
      const curatorDirPath = await this.createCuratorDir();
      await this.extractLatestCurator(curatorDirPath);
      return curatorDirPath;
    })();
    const curatorDirPath = await this.downloadedCuratorPromise;

    let curatorService = 'https://barque.corp.mongodb.com';
    if (isDryRun) {
      const fauxService = http.createServer((req, res) => {
        req.resume().on('end', () => {
          res.end('{"Status":{"Completed":true}}');
        });
      });
      fauxService.listen(0);
      fauxService.unref();
      await once(fauxService, 'listening');
      curatorService = `http://localhost:${
        (fauxService.address() as any).port
      }`;
    }

    const { ppas, arch } = getReposAndArch(buildVariant);
    return await this.execCurator(
      curatorDirPath,
      packageUrl,
      repoConfig,
      ppas,
      arch,
      curatorService
    );
  }

  async execCurator(
    curatorDirPath: string,
    packageUrl: string,
    repoConfig: string,
    ppasWithServerVersions: PPARepositoryAndServerVersions[],
    architecture: string,
    curatorService: string
  ): Promise<string[]> {
    const results: Promise<string>[] = [];
    for (const { repo: ppa, serverVersions } of ppasWithServerVersions) {
      for (const version of serverVersions) {
        for (const edition of this.mongodbEditions) {
          // For ppc64le and s390x, we only publish enterprise edition only
          // starting server version 6. But in order to keep the current publishing
          // behaviour, we will only skip publishing for server version 8.0 community
          // edition.
          if (
            edition === 'org' &&
            ['ppc64le', 's390x'].includes(architecture) &&
            semver.gte(version, '8.0.0')
          ) {
            console.info(
              `Skipping publishing community v${version} for ${architecture}`
            );
            continue;
          }

          const args = [
            '--level',
            'debug',
            'repo',
            'submit',
            '--service',
            curatorService,
            '--config',
            repoConfig,
            '--distro',
            ppa,
            '--arch',
            architecture,
            '--edition',
            edition,
            '--version',
            version,
            '--packages',
            packageUrl,
          ];
          console.info(`Running ${curatorDirPath}/curator ${args.join(' ')}`);
          results.push(
            (async () => {
              try {
                const result = await withRetries(
                  () =>
                    execFile(`${curatorDirPath}/curator`, args, {
                      // curator looks for these options in env
                      env: {
                        NOTARY_KEY_NAME:
                          this.serverVersionNotaryKeys[version].notaryKeyName,
                        NOTARY_TOKEN:
                          this.serverVersionNotaryKeys[version].notaryToken,
                        BARQUE_API_KEY: process.env.BARQUE_API_KEY,
                        BARQUE_USERNAME: process.env.BARQUE_USERNAME,
                      },
                    }),
                  4
                );
                console.info(
                  `Result for curator with ${args.join(' ')}`,
                  result
                );
                return this.computePublishedPackageUrl(
                  ppa,
                  architecture,
                  version,
                  edition,
                  packageUrl
                );
              } catch (error: any) {
                console.error(`Curator with ${args.join(' ')} failed`, error);
                throw new Error(
                  `Curator is unable to upload ${packageUrl},${ppa},${architecture} to barque ${error}`
                );
              }
            })()
          );
        }
      }
    }
    return await Promise.all(results);
  }

  computePublishedPackageUrl(
    ppa: PPARepository,
    targetArchitecture: string,
    mongodbVersion: string,
    edition: string,
    packageUrl: string
  ): string {
    const packageFileName = packageUrl.split('/').slice(-1);
    const packageFolderVersion = mongodbVersion
      .split('.')
      .slice(0, 2)
      .join('.');
    const base =
      edition === 'org'
        ? 'https://repo.mongodb.org'
        : 'https://repo.mongodb.com';
    switch (ppa) {
      case 'ubuntu1804':
        return `${base}/apt/ubuntu/dists/bionic/mongodb-${edition}/${packageFolderVersion}/multiverse/binary-${targetArchitecture}/${packageFileName}`;
      case 'ubuntu2004':
        return `${base}/apt/ubuntu/dists/focal/mongodb-${edition}/${packageFolderVersion}/multiverse/binary-${targetArchitecture}/${packageFileName}`;
      case 'ubuntu2204':
        return `${base}/apt/ubuntu/dists/jammy/mongodb-${edition}/${packageFolderVersion}/multiverse/binary-${targetArchitecture}/${packageFileName}`;
      case 'ubuntu2404':
        return `${base}/apt/ubuntu/dists/noble/mongodb-${edition}/${packageFolderVersion}/multiverse/binary-${targetArchitecture}/${packageFileName}`;
      case 'debian10':
        return `${base}/apt/debian/dists/buster/mongodb-${edition}/${packageFolderVersion}/main/binary-${targetArchitecture}/${packageFileName}`;
      case 'debian11':
        return `${base}/apt/debian/dists/bullseye/mongodb-${edition}/${packageFolderVersion}/main/binary-${targetArchitecture}/${packageFileName}`;
      case 'debian12':
        return `${base}/apt/debian/dists/bookworm/mongodb-${edition}/${packageFolderVersion}/main/binary-${targetArchitecture}/${packageFileName}`;
      case 'rhel70':
        return `${base}/yum/redhat/7/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      case 'rhel80':
        return `${base}/yum/redhat/8/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      case 'rhel90':
        return `${base}/yum/redhat/9/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      case 'amazon1':
        return `${base}/yum/amazon/2013.03/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      case 'amazon2':
        return `${base}/yum/amazon/2/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      case 'amazon2023':
        return `${base}/yum/amazon/2023/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      case 'suse12':
        return `${base}/zypper/suse/12/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      case 'suse15':
        return `${base}/zypper/suse/15/mongodb-${edition}/${packageFolderVersion}/${targetArchitecture}/RPMS/${packageFileName}`;
      default:
        throw new Error(
          `Unsupported PPA, could not compute published mongosh package URL: ${ppa}`
        );
    }
  }

  /**
   * Waits until the given packages are available under the specified URLs or throws an error if there
   * are still remaining packages after the timeout.
   *
   * Note that the method will try all URLs at least once after an initial delay of `sleepTimeSeconds`.
   */
  async waitUntilPackagesAreAvailable(
    publishedPackageUrls: string[],
    timeoutSeconds: number,
    sleepTimeSeconds = 10
  ): Promise<void> {
    let remainingPackages = [...publishedPackageUrls];
    const sleep = promisify(setTimeout);

    const startMs = new Date().getTime();
    const failOnTimeout = () => {
      if (new Date().getTime() - startMs > timeoutSeconds * 1000) {
        throw new Error(
          `Barque timed out - the following packages are still not available: ${remainingPackages.join(
            ', '
          )}`
        );
      }
    };

    while (remainingPackages.length) {
      console.info(
        `Waiting for availability of:\n - ${remainingPackages.join('\n - ')}`
      );
      await sleep(sleepTimeSeconds * 1000);

      const promises = remainingPackages.map(
        async (url) =>
          await fetch(url, {
            method: 'HEAD',
          })
      );
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
    await fs.mkdir(dir.path, { mode: 0o755, recursive: true });

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
    if (response.ok && response.body) {
      return pipeline(response.body, zlib.createGunzip(), tar.extract(dest));
    }
  }
}
