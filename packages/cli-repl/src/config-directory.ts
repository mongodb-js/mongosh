import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { EJSON } from 'bson';

/**
 * A set of paths that are used by the shell, typically located
 * within the user's home directory.
 */
export type ShellHomePaths = {
  /** A path to data that should be shared between machines if the same user is using them, e.g. config data */
  shellRoamingDataPath: string;
  /** A path to data that should not be shared between machines, e.g. logs */
  shellLocalDataPath: string;
  /** A path to a directory containing user-provided startup scripts (typically $HOME) */
  shellRcPath: string;
};

/**
 * A helper class for accessing files that are stored under the paths typically used by the shell.
 */
export class ShellHomeDirectory {
  paths: ShellHomePaths;
  ensureExistsPromise: Promise<void> | null = null;

  constructor(paths: ShellHomePaths) {
    this.paths = paths;
  }

  /**
   * Make sure that all necessary directories used by this shell instance
   * actually exist.
   */
  async ensureExists(): Promise<void> {
    this.ensureExistsPromise ??= (async () => {
      await fs.mkdir(this.paths.shellRoamingDataPath, {
        recursive: true,
        mode: 0o700,
      });
      await fs.mkdir(this.paths.shellLocalDataPath, {
        recursive: true,
        mode: 0o700,
      });
    })();
    return this.ensureExistsPromise;
  }

  /**
   * Return a path to a specific file in the roaming directory.
   */
  roamingPath(subpath: string): string {
    return path.join(this.paths.shellRoamingDataPath, subpath);
  }

  /**
   * Return a path to a specific file in the local directory.
   */
  localPath(subpath: string): string {
    return path.join(this.paths.shellLocalDataPath, subpath);
  }

  /**
   * Return a path to a specific file in the startup file directory.
   */
  rcPath(subpath: string): string {
    return path.join(this.paths.shellRcPath, subpath);
  }
}

/**
 * A helper class for managing a config file and its contents.
 * The type of the config data object itself is `Config`.
 */
export class ConfigManager<Config> extends EventEmitter {
  shellHomeDirectory: ShellHomeDirectory;
  config: Config | null;

  constructor(shellHomeDirectory: ShellHomeDirectory) {
    super();
    this.shellHomeDirectory = shellHomeDirectory;
    this.config = null;
  }

  /**
   * Return the path to the config file.
   */
  path(): string {
    return this.shellHomeDirectory.roamingPath('config');
  }

  /**
   * Checks if config file exists.
   *
   * If exists: Read config from the file and return it.
   * If does not exist: Writes a new file with the passed-in config object.
   */
  async generateOrReadConfig(defaultConfig: Config): Promise<Config> {
    await this.shellHomeDirectory.ensureExists();
    let fd;

    try {
      try {
        fd = await fs.open(this.path(), 'r');
      } catch (err: any) {
        if (err?.code !== 'ENOENT') {
          this.emit('error', err);
          throw err;
        }
      }

      if (fd !== undefined) {
        // Not the first access. Read the file and return it.
        try {
          const config: Config = EJSON.parse(
            await fd.readFile({ encoding: 'utf8' })
          ) as any;
          this.emit('update-config', config);
          return { ...defaultConfig, ...config };
        } catch (err: any) {
          this.emit('error', err);
          return defaultConfig;
        }
      } else {
        // First access. Write the default config.
        await this.writeConfigFile(defaultConfig);
        this.emit('new-config', defaultConfig);
        return defaultConfig;
      }
    } finally {
      await fd?.close();
    }
  }

  /**
   * Write the specified config to the configuration file path.
   */
  async writeConfigFile(config: Config): Promise<void> {
    await this.shellHomeDirectory.ensureExists();
    try {
      await fs.writeFile(this.path(), EJSON.stringify(config), { mode: 0o600 });
    } catch (err: any) {
      this.emit('error', err);
      throw err;
    }
  }
}

/**
 * Compute the set of storage paths that mongosh uses, depending on the platform.
 */
export function getStoragePaths(): ShellHomePaths {
  let shellLocalDataPath;
  let shellRoamingDataPath;
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    const localAppData = process.env.LOCALAPPDATA ?? process.env.APPDATA;
    if (localAppData && appData) {
      shellLocalDataPath = path.join(localAppData, 'mongodb', 'mongosh');
      shellRoamingDataPath = path.join(appData, 'mongodb', 'mongosh');
    }
  }
  const homedir = path.join(os.homedir(), '.mongodb', 'mongosh');
  shellLocalDataPath ??= homedir;
  shellRoamingDataPath ??= homedir;
  return {
    shellLocalDataPath,
    shellRoamingDataPath,
    shellRcPath: os.homedir(),
  };
}

/**
 * Compute the list of global configuration files that mongosh uses,
 * depending on the platform.
 */
export function getGlobalConfigPaths(): string[] {
  const paths: string[] = [];

  if (process.env.MONGOSH_GLOBAL_CONFIG_FILE_FOR_TESTING) {
    paths.push(process.env.MONGOSH_GLOBAL_CONFIG_FILE_FOR_TESTING);
  }

  switch (process.platform) {
    case 'win32':
      if (process.execPath === process.argv[1]) {
        paths.push(path.resolve(process.execPath, '..', 'mongosh.cfg'));
      }
      return paths;
    case 'darwin':
      paths.push('/usr/local/etc/mongosh.conf');
      paths.push('/opt/homebrew/etc/mongosh.conf');
    // fallthrough
    default:
      paths.push('/etc/mongosh.conf');
      return paths;
  }
}
