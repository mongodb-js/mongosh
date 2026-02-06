import type {
  ShellPlugin,
  ShellInstanceState,
  TypeSignature,
} from '@mongosh/shell-api';
import { signatures } from '@mongosh/shell-api';
import { MongoshRuntimeError, MongoshInvalidInputError } from '@mongosh/errors';
import type { SnippetShellUserConfig, MongoshBus } from '@mongosh/types';
import escapeRegexp from 'escape-string-regexp';
import path from 'path';
import { promisify, isDeepStrictEqual } from 'util';
import { Console } from 'console';
import { promises as fs } from 'fs';
import stream, { PassThrough } from 'stream';
import { once } from 'events';
import * as tar from 'tar';
import zlib from 'zlib';
import bson from 'bson';
import { z } from 'zod';
import type {
  AgentWithInitialize,
  DevtoolsProxyOptions,
  Response,
} from '@mongodb-js/devtools-proxy-support';
import { createFetch } from '@mongodb-js/devtools-proxy-support';
const pipeline = promisify(stream.pipeline);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export interface SnippetOptions {
  installdir: string;
  instanceState: ShellInstanceState;
  skipInitialIndexLoad?: boolean;
  proxyOptions?: DevtoolsProxyOptions | AgentWithInitialize;
}

interface NpmMetaDataResponse {
  dist?: {
    tarball?: string;
  };
}

const regExpTag = Object.prototype.toString.call(/foo/);
const errorMatcherSchema = z.object({
  message: z.string(),
  matches: z.array(
    z.custom<RegExp>((val) => Object.prototype.toString.call(val) === regExpTag)
  ),
});
const indexDescriptionSchema = z.object({
  name: z.string(),
  snippetName: z.string(),
  installSpec: z.string().optional(),
  version: z.string(),
  description: z.string(),
  license: z.string(),
  readme: z.string(),
  errorMatchers: z.array(errorMatcherSchema).optional(),
});
const indexFileSchema = z.object({
  indexFileVersion: z.number().int().max(1),

  metadata: z
    .object({
      homepage: z.string(),
    })
    .passthrough(),

  index: z.array(indexDescriptionSchema),
});

export type ErrorMatcher = z.infer<typeof errorMatcherSchema>;
export type SnippetIndexFile = z.infer<typeof indexFileSchema> & {
  sourceURL: string;
};
export type SnippetDescription = z.infer<typeof indexDescriptionSchema>;

async function unpackBSON<T = any>(data: Buffer): Promise<T> {
  return bson.deserialize(await brotliDecompress(data)) as T;
}

async function packBSON(data: any): Promise<Buffer> {
  return await brotliCompress(bson.serialize(data));
}

function completeSnippetsCommand(
  args: string[],
  snippets: SnippetDescription[]
) {
  const plainCommands = [
    'update',
    'search',
    'ls',
    'outdated',
    'info',
    'refresh',
    'load-all',
  ];
  const pkgCommands = ['install', 'uninstall', 'help'];
  if (args.length >= 2 && pkgCommands.includes(args[1])) {
    const allSnippetNames = snippets.map(({ snippetName }) => snippetName);
    if (args.length === 2) {
      return allSnippetNames.map((str) => `${args[1]} ${str}`);
    }
    return allSnippetNames.filter((str) =>
      str.startsWith(args[args.length - 1] ?? '')
    );
  } else if (args.length === 2) {
    return [...plainCommands, ...pkgCommands].filter((str) =>
      str.startsWith(args[1] ?? '')
    );
  }
  return undefined;
}

export class SnippetManager implements ShellPlugin {
  _instanceState: ShellInstanceState;
  installdir: string;
  repos: SnippetIndexFile[] | null;
  load: (filename: string) => Promise<void>;
  require: any;
  config: {
    get<T extends keyof SnippetShellUserConfig>(
      key: T
    ): Promise<SnippetShellUserConfig[T]>;
  };
  print: (...args: any[]) => Promise<void>;
  npmArgv: string[];
  inflightFetchIndexPromise: Promise<SnippetIndexFile[]> | null = null;
  fetch: (url: string) => Promise<Response>;

  constructor({
    installdir,
    instanceState,
    skipInitialIndexLoad,
    proxyOptions = {},
  }: SnippetOptions) {
    const { load, config, print, require } = instanceState.context;
    this._instanceState = instanceState;
    this.load = load;
    this.config = config;
    this.print = print;
    // We need 'require' from the REPL, even though we only deal with absolute
    // paths here, because the local 'require' in this file is rendered useless
    // through the bundling step.
    this.require = require;
    this.installdir = installdir;
    this.repos = null;
    this.npmArgv = [];
    this.fetch = createFetch(proxyOptions);

    if (!skipInitialIndexLoad) {
      this.prepareIndex().catch(() => {});
    }

    // TODO: This is a terrible way to add functionality to the shell and
    // currently forces SnippetManager to be a singleton.
    const wrapperFn = (...args: string[]) => {
      return Object.assign(this.runSnippetCommand(args), {
        [Symbol.for('@@mongosh.syntheticPromise')]: true,
      });
    };
    wrapperFn.isDirectShellCommand = true;
    wrapperFn.returnsPromise = true;
    (instanceState.shellApi as any).snippet = instanceState.context.snippet =
      wrapperFn;
    (signatures.ShellApi.attributes as any).snippet = {
      type: 'function',
      returnsPromise: true,
      isDirectShellCommand: true,
      shellCommandCompleter: async (
        params: unknown,
        args: string[]
        // eslint-disable-next-line @typescript-eslint/require-await
      ): Promise<string[] | undefined> => {
        return completeSnippetsCommand(args, this.snippets);
      },
      newShellCommandCompleter: async (
        context: unknown,
        args: string[]
        // eslint-disable-next-line @typescript-eslint/require-await
      ): Promise<string[] | undefined> => {
        return completeSnippetsCommand(args, this.snippets);
      },
    } as TypeSignature;
    instanceState.registerPlugin(this);

    this.messageBus.emit('mongosh-snippets:loaded', { installdir });
  }

  static create(options: SnippetOptions): SnippetManager {
    return new SnippetManager(options);
  }

  get messageBus(): MongoshBus {
    return this._instanceState.messageBus;
  }

  async prepareNpm(): Promise<string[]> {
    const npmdir = path.join(this.installdir, 'node_modules', 'npm');
    const npmclipath = path.join(npmdir, 'bin', 'npm-cli.js');

    await fs.mkdir(this.installdir, { recursive: true });
    try {
      await fs.stat(npmclipath);
      this.messageBus.emit('mongosh-snippets:npm-lookup', {
        existingVersion: '<local>',
      });
      return [process.execPath, npmclipath];
    } catch {
      /* ignore */
    }
    try {
      const existingVersion = (
        await this.execFile(['npm', '--version'])
      ).trim();
      this.messageBus.emit('mongosh-snippets:npm-lookup', { existingVersion });
      const major = +existingVersion.split('.')[0];
      if (major >= 6) return ['npm'];
    } catch {
      /* ignore */
    }

    const { evaluationListener, interrupted } = this._instanceState;
    interrupted.checkpoint();
    const result = await evaluationListener.onPrompt?.(
      'This operation requires downloading a recent release of npm. Do you want to proceed? [Y/n]',
      'yesno'
    );
    if (result === 'no') {
      this.messageBus.emit('mongosh-snippets:npm-lookup-stopped');
      throw new MongoshRuntimeError('Stopped by user request');
    }

    const npmMetadataURL = (await this.registryBaseUrl()) + '/npm/latest';
    interrupted.checkpoint();
    const npmMetadataResponse = await this.fetch(npmMetadataURL);
    if (!npmMetadataResponse.ok) {
      this.messageBus.emit('mongosh-snippets:npm-download-failed', {
        npmMetadataURL,
        status: npmMetadataResponse.status,
      });
      throw new MongoshRuntimeError(
        `Failed to download npm: ${npmMetadataURL}: ${npmMetadataResponse.statusText}`
      );
    }
    interrupted.checkpoint();
    const npmTarballURL = (
      (await npmMetadataResponse.json()) as NpmMetaDataResponse
    )?.dist?.tarball;
    if (!npmTarballURL) {
      this.messageBus.emit('mongosh-snippets:npm-download-failed', {
        npmMetadataURL,
        npmTarballURL,
      });
      throw new MongoshRuntimeError(
        `Failed to download npm: ${npmMetadataURL}: Registry returned no download source`
      );
    }
    interrupted.checkpoint();
    await this.print(`Downloading npm from ${npmTarballURL}...`);
    const npmTarball = await this.fetch(npmTarballURL);
    if (!npmTarball.ok || !npmTarball.body) {
      this.messageBus.emit('mongosh-snippets:npm-download-failed', {
        npmMetadataURL,
        npmTarballURL,
        status: npmTarball.status,
      });
      throw new MongoshRuntimeError(
        `Failed to download npm: ${npmTarballURL}: ${npmTarball.statusText}`
      );
    }
    this.messageBus.emit('mongosh-snippets:npm-download-active', {
      npmMetadataURL,
      npmTarballURL,
    });
    interrupted.checkpoint();
    await fs.mkdir(npmdir, { recursive: true });
    await pipeline(npmTarball.body, tar.x({ strip: 1, C: npmdir }));
    await this.editPackageJSON((pjson) => {
      (pjson.dependencies ??= {}).npm = '*';
    });
    return [process.execPath, npmclipath];
  }

  async prepareIndex(
    refreshMode: 'force-refresh' | 'allow-cached' = 'allow-cached'
  ): Promise<SnippetIndexFile[]> {
    // Fetch the index data and store it in this.repos. Use a saved Promise to
    // ensure that only one such operation is happening at any given time.
    return (this.repos = await (this.inflightFetchIndexPromise ??=
      (async () => {
        this.messageBus.emit('mongosh-snippets:fetch-index', { refreshMode });
        const cachePath = path.join(this.installdir, 'index.bson.br');
        await fs.mkdir(this.installdir, { recursive: true });

        const sourceURLs = (await this.config.get('snippetIndexSourceURLs'))
          .split(';')
          .filter(Boolean);
        let repoData: SnippetIndexFile[] | null = null;
        let fetchedFromNetwork = false;
        try {
          // First, look at what is available in the cached infex file.
          repoData = (await unpackBSON(await fs.readFile(cachePath))).repoData;
        } catch {
          /* ignore */
        }

        if (repoData !== null) {
          // Do some cache validation: The cache is only valid if the set of
          // source URLs is equal to the set of configured index source URLs.
          const cachedSourceURLs = repoData.map(
            (repo: SnippetIndexFile) => repo.sourceURL
          );
          if (
            cachedSourceURLs.length !== sourceURLs.length ||
            cachedSourceURLs.some((url) => !sourceURLs.includes(url))
          ) {
            this.messageBus.emit('mongosh-snippets:fetch-cache-invalid');
            repoData = null; // URL mismatch, cache invalid.
          }
        }

        // If we do not have a cache, or decided to fetch from network anyway,
        // do that.
        if (!repoData || refreshMode === 'force-refresh') {
          fetchedFromNetwork = true;
          // Fetch all index files.
          repoData = await Promise.all(
            sourceURLs.map(async (url: string) => {
              const repoRes = await this.fetch(url);
              if (!repoRes.ok) {
                this.messageBus.emit('mongosh-snippets:fetch-index-error', {
                  action: 'fetch',
                  url,
                  status: repoRes.status,
                });
                throw new MongoshRuntimeError(
                  `The specified index file ${url} could not be read: ${repoRes.statusText}`
                );
              }
              const arrayBuffer = await repoRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              let data;
              try {
                data = await unpackBSON<Omit<SnippetIndexFile, 'sourceURL'>>(
                  buffer
                );
              } catch (err: any) {
                this.messageBus.emit('mongosh-snippets:fetch-index-error', {
                  action: 'parse-fetched',
                  url,
                  error: err?.message,
                });
                throw new MongoshRuntimeError(
                  `The specified index file ${url} could not be parsed: ${err.message}`
                );
              }
              const { error, data: parsedData } =
                indexFileSchema.safeParse(data);
              if (error) {
                this.messageBus.emit('mongosh-snippets:fetch-index-error', {
                  action: 'validate-fetched',
                  url,
                  error: error.message,
                });
                throw new MongoshRuntimeError(
                  `The specified index file ${url} is not a valid index file: ${error.message}`
                );
              }
              return { ...parsedData, sourceURL: url };
            })
          );
          // If possible, write the result to disk for caching.
          try {
            await fs.writeFile(cachePath, await packBSON({ repoData }));
          } catch (err: any) {
            this.messageBus.emit('mongosh-snippets:fetch-index-error', {
              action: 'save',
              error: err?.message,
            });
          }
        }
        this.messageBus.emit('mongosh-snippets:fetch-index-done');
        this.inflightFetchIndexPromise = null;

        if (
          !fetchedFromNetwork &&
          Date.now() - (await fs.stat(cachePath)).mtime.getTime() > 3600_000
        ) {
          // If the cache is old, we still use it, but we also kick off a new
          // network fetch.
          this.prepareIndex('force-refresh').catch(() => {});
        }

        return repoData;
      })()));
  }

  get snippets(): SnippetDescription[] {
    return (
      this.repos?.flatMap((repository: SnippetIndexFile) => repository.index) ??
      []
    );
  }

  async registryBaseUrl(): Promise<string> {
    return await this.config.get('snippetRegistryURL');
  }

  async ensureSetup(): Promise<string[]> {
    if (this.npmArgv.length > 0 && this.repos) {
      return this.npmArgv;
    }

    this._instanceState.interrupted.checkpoint();
    [this.npmArgv, this.repos] = await Promise.all([
      this.prepareNpm(),
      this.prepareIndex(),
    ]);
    return this.npmArgv;
  }

  async editPackageJSON<T>(fn: (pjson: any) => T): Promise<T> {
    let pjson = {};
    try {
      pjson = JSON.parse(
        await fs.readFile(path.join(this.installdir, 'package.json'), 'utf8')
      );
    } catch (err: any) {
      this.messageBus.emit('mongosh-snippets:package-json-edit-error', {
        error: err?.message,
      });
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    const origContent = JSON.parse(JSON.stringify(pjson));
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const result = await fn(pjson);
    if (!isDeepStrictEqual(origContent, result)) {
      await fs.writeFile(
        path.join(this.installdir, 'package.json'),
        JSON.stringify(pjson, null, '  ')
      );
    }
    return result;
  }

  /** If lenient is true we will return the stdout either way, even if the process fails.
   * This is important for commands like `npm outdated` that might exit with a non-zero
   *	status but the output is still useful.
   **/
  async runNpm(npmArgs: string[], lenient = false): Promise<string> {
    await this.editPackageJSON(() => {}); // Ensure package.json exists.
    return await this.execFile(
      [
        ...(await this.ensureSetup()),
        '--no-package-lock',
        '--ignore-scripts',
        '--loglevel=notice',
        `--registry=${await this.registryBaseUrl()}`,
        ...npmArgs,
      ],
      lenient
    );
  }

  async execFile([cmd, ...args]: string[], lenient = false) {
    const { interrupted } = this._instanceState;
    this.messageBus.emit('mongosh-snippets:spawn-child', {
      args: [cmd, ...args],
    });
    interrupted.checkpoint();

    // 'child_process' is not supported in startup snapshots yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const spawn = require('cross-spawn');
    const proc = spawn(cmd, args, {
      cwd: this.installdir,
      env: { ...process.env, MONGOSH_RUN_NODE_SCRIPT: '1' },
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    (proc.stdout as NodeJS.ReadableStream)
      .setEncoding('utf8')
      .on('data', (chunk) => {
        stdout += chunk;
      });
    (proc.stderr as NodeJS.ReadableStream)
      .setEncoding('utf8')
      .on('data', (chunk) => {
        stderr += chunk;
      });

    const interruptPromise = interrupted.asPromise();
    interruptPromise.promise.catch(() => {}); // Suppress UnhandledPromiseRejectionWarning
    try {
      const [exitCode] = await Promise.race([
        interruptPromise.promise,
        once(proc, 'close'),
      ]);
      // Allow exit code 1 if stderr is empty, i.e. no error occurred, because
      // that is how commands like `npm outdated` report their result.
      if (
        lenient ||
        exitCode === 0 ||
        (exitCode === 1 && stderr === '' && stdout)
      ) {
        return stdout;
      }
      throw new Error(
        `Command failed: ${[cmd, ...args].join(
          ' '
        )} with exit code ${exitCode}: ${stderr} ${stdout}`
      );
    } finally {
      interruptPromise.destroy();
      if (proc.exitCode === null && proc.signalCode === null) {
        proc.kill(); // Not exited yet, i.e. this was interrupted.
      }
    }
  }

  async search(): Promise<string> {
    await this.ensureSetup();
    const list = this.snippets.map(
      ({ snippetName, version, description }: any) => ({
        name: snippetName,
        version,
        description,
      })
    );

    const tableOutput = new PassThrough({ encoding: 'utf8' });
    new Console(tableOutput).table(list);
    return tableOutput.read();
  }

  async loadAllSnippets(
    autoloadMode: 'always' | 'only-autoload' = 'only-autoload'
  ): Promise<void> {
    if (
      autoloadMode === 'only-autoload' &&
      !(await this.config.get('snippetAutoload'))
    ) {
      return;
    }

    let installedPackages;
    try {
      installedPackages = await this.editPackageJSON((pjson) =>
        Object.keys(pjson.dependencies ?? {})
      );
    } catch (err: any) {
      if (autoloadMode === 'only-autoload') {
        return; // Could not load snippets. The user will be aware of this soon enough, most likely.
      }
      throw err;
    }
    for (const name of installedPackages) {
      if (name === 'npm') {
        continue;
      }
      const packagePath = path.resolve(this.installdir, 'node_modules', name);
      this.messageBus.emit('mongosh-snippets:load-snippet', {
        source: 'load-all',
        name,
      });
      this._instanceState.interrupted.checkpoint();
      await this.load(this.require.resolve(packagePath));
    }
  }

  async runSnippetCommand(args: string[]): Promise<string> {
    this.messageBus.emit('mongosh-snippets:snippet-command', { args });
    switch (args[0]) {
      case 'help':
        return await this.helpText(args[1]);
      case 'refresh':
        await this.prepareIndex('force-refresh');
        return 'Done!';
      case 'install':
      case 'uninstall':
      case 'update':
        return await this.runInstallLikeCmd(args);
      case 'outdated':
      case 'ls': {
        let output;
        if (args[0] === 'ls') {
          output = await this.runNpm(['ls', '--depth=0'], true);
        } else {
          output = await this.runNpm([args[0]], true);
        }

        const firstLineEnd = output.indexOf('\n');
        let packages = output.substr(firstLineEnd + 1);
        for (const { name, snippetName } of this.snippets) {
          packages = packages.replace(
            new RegExp(escapeRegexp(name), 'g'),
            `mongosh:${snippetName}`
          );
        }
        return (
          (firstLineEnd < 0 ? output : output.substr(0, firstLineEnd + 1)) +
          packages
        );
      }
      case 'search':
        return await this.search();
      case 'info':
        return await this.showInfo();
      case 'load-all':
        await this.loadAllSnippets('always');
        return 'All installed snippets loaded';
      default:
        return `Unknown command "${args[0]}". Run 'snippet help' to list all available commands.`;
    }
  }

  async runInstallLikeCmd(args: string[]): Promise<string> {
    const { evaluationListener } = this._instanceState;
    await this.ensureSetup();

    const snippetDescs: SnippetDescription[] = [];
    for (let i = 1; i < args.length; i++) {
      const snippetDesc = this.snippets.find(
        ({ snippetName }) => snippetName === args[i]
      );
      if (!snippetDesc) {
        throw new MongoshInvalidInputError(`Unknown snippet "${args[i]}"`);
      }
      snippetDescs.push(snippetDesc);
    }

    await this.editPackageJSON((pjson) => {
      for (const { name } of snippetDescs) {
        (pjson.dependencies ??= {})[name] =
          args[0] === 'uninstall' ? undefined : '*';
      }
    });

    const npmArguments = snippetDescs.map(({ name, installSpec }) => {
      return name + (args[0] === 'install' ? `@${installSpec ?? '*'}` : '');
    });
    await this.print(`Running ${args[0]}...`);
    await this.runNpm([args[0], '--save', ...npmArguments]);
    if (args[0] === 'install' && snippetDescs.length > 0) {
      this._instanceState.interrupted.checkpoint();
      const loadNow = await evaluationListener.onPrompt?.(
        `Installed new snippets ${args.slice(
          1
        )}. Do you want to load them now? [Y/n]`,
        'yesno'
      );
      if (loadNow !== 'no') {
        for (const { name } of snippetDescs) {
          this.messageBus.emit('mongosh-snippets:load-snippet', {
            source: 'install',
            name,
          });
          this._instanceState.interrupted.checkpoint();
          await this.load(
            this.require.resolve(
              path.join(this.installdir, 'node_modules', name)
            )
          );
        }
      }
      return `Finished installing snippets: ${args.slice(1)}`;
    }
    return 'Done!';
  }

  async helpText(snippet = ''): Promise<string> {
    if (snippet) {
      await this.prepareIndex();
      const info = this.snippets.find(
        ({ snippetName }: any) => snippetName === snippet
      );
      if (!info) {
        throw new MongoshInvalidInputError(`Unknown snippet "${snippet}"`);
      }
      if (!info.readme) {
        throw new MongoshRuntimeError(
          `No help information available for "${snippet}"`
        );
      }
      return info.readme;
    }

    return `\
snippet <command> [args...]

  snippet install <name>     Install a new snippet
  snippet uninstall <name>   Remove an installed snippet
  snippet update             Get the latest versions of installed snippets
  snippet search             List available snippets
  snippet ls                 List installed snippets
  snippet outdated           List outdated snippets
  snippet help               Show this text
  snippet help <name>        Show information about a specific snippet
  snippet info               Show information about the snippet repository
  snippet refresh            Clear and refresh the snippet metadata cache
  snippet load-all           Load all available snippets using load()
`;
  }

  async showInfo(): Promise<string> {
    await this.prepareIndex();
    return (
      this.repos
        ?.map(
          (repository) => `\
Snippet repository URL:      ${repository.sourceURL}
  -->  Homepage:             ${repository.metadata.homepage}
`
        )
        .join('\n') ?? 'Not enabled'
    );
  }

  transformError(err: Error): Error {
    if (!this.repos) return err;

    for (const { errorMatchers, name } of this.snippets) {
      for (const { matches, message } of errorMatchers ?? []) {
        for (const regexp of matches) {
          if (err.message.match(regexp)) {
            this.messageBus.emit('mongosh-snippets:transform-error', {
              error: err.message,
              addition: message,
              name,
            });
            err.message += ` (${message})`;
            return err;
          }
        }
      }
    }
    return err;
  }
}
