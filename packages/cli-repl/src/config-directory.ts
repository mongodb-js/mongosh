import { promises as fs } from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class ShellHomeDirectory {
  baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;
  }

  async ensureExists(): Promise<void> {
    await fs.mkdir(this.baseDirectory, { recursive: true });
  }

  path(subpath: string): string {
    return path.join(this.baseDirectory, subpath);
  }
}

export class ConfigManager<Config> extends EventEmitter {
  shellHomeDirectory: ShellHomeDirectory;
  config: Config | null;

  constructor(shellHomeDirectory: ShellHomeDirectory) {
    super();
    this.shellHomeDirectory = shellHomeDirectory;
    this.config = null;
  }

  path() {
    return this.shellHomeDirectory.path('config');
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
      } catch (err) {
        if (err.code !== 'ENOENT') {
          this.emit('error', err);
          throw err;
        }
      }

      if (fd !== undefined) {
        // Not the first access. Read the file and return it.
        try {
          const config: Config = JSON.parse(await fd.readFile({ encoding: 'utf8' }));
          this.emit('update-config', config);
          return config;
        } catch (err) {
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
      await fs.writeFile(this.path(), JSON.stringify(config));
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }
}
