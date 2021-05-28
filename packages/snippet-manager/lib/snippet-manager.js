"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippetManager = void 0;
const shell_api_1 = require("@mongosh/shell-api");
const errors_1 = require("@mongosh/errors");
const escape_string_regexp_1 = __importDefault(require("escape-string-regexp"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const console_1 = require("console");
const fs_1 = require("fs");
const child_process_1 = __importDefault(require("child_process"));
const stream_1 = __importStar(require("stream"));
const events_1 = require("events");
const node_fetch_1 = __importDefault(require("node-fetch"));
const tar_1 = __importDefault(require("tar"));
const zlib_1 = __importDefault(require("zlib"));
const bson_1 = __importDefault(require("bson"));
const joi_1 = __importDefault(require("joi"));
const execFile = util_1.promisify(child_process_1.default.execFile);
const pipeline = util_1.promisify(stream_1.default.pipeline);
const brotliCompress = util_1.promisify(zlib_1.default.brotliCompress);
const brotliDecompress = util_1.promisify(zlib_1.default.brotliDecompress);
const indexFileSchema = joi_1.default.object({
    indexFileVersion: joi_1.default.number()
        .integer()
        .max(1)
        .required(),
    metadata: joi_1.default.object({
        homepage: joi_1.default.string()
    }),
    index: joi_1.default.array().required().items(joi_1.default.object({
        name: joi_1.default.string().required(),
        snippetName: joi_1.default.string().required(),
        installSpec: joi_1.default.string(),
        version: joi_1.default.string().required(),
        description: joi_1.default.string().required().allow(''),
        license: joi_1.default.string().required(),
        readme: joi_1.default.string().required().allow(''),
        errorMatchers: joi_1.default.array().items(joi_1.default.object({
            message: joi_1.default.string().required(),
            matches: joi_1.default.array().required().items(joi_1.default.object().regex())
        }))
    }))
});
async function unpackBSON(data) {
    return bson_1.default.deserialize(await brotliDecompress(data));
}
async function packBSON(data) {
    return await brotliCompress(bson_1.default.serialize(data));
}
class SnippetManager {
    constructor({ installdir, internalState }) {
        this.inflightFetchIndexPromise = null;
        const { load, config, print } = internalState.context;
        this._internalState = internalState;
        this.load = load;
        this.config = config;
        this.print = print;
        this.installdir = installdir;
        this.repos = null;
        this.npmArgv = [];
        this.prepareIndex().catch(() => { });
        const wrapperFn = (...args) => {
            return Object.assign(this.runSnippetCommand(args), {
                [Symbol.for('@@mongosh.syntheticPromise')]: true
            });
        };
        wrapperFn.isDirectShellCommand = true;
        wrapperFn.returnsPromise = true;
        internalState.shellApi.snippet = internalState.context.snippet = wrapperFn;
        shell_api_1.signatures.ShellApi.attributes.snippet = {
            type: 'function',
            returnsPromise: true,
            isDirectShellCommand: true,
            shellCommandCompleter: async (params, args) => {
                const plainCommands = ['update', 'search', 'ls', 'outdated', 'info', 'refresh', 'load-all'];
                const pkgCommands = ['install', 'uninstall', 'help'];
                if (args.length >= 2 && pkgCommands.includes(args[1])) {
                    const allSnippetNames = this.snippets.map(({ snippetName }) => snippetName);
                    if (args.length === 2) {
                        return allSnippetNames.map(str => `${args[1]} ${str}`);
                    }
                    return allSnippetNames.filter(str => { var _a; return str.startsWith((_a = args[args.length - 1]) !== null && _a !== void 0 ? _a : ''); });
                }
                else if (args.length === 2) {
                    return [...plainCommands, ...pkgCommands].filter(str => { var _a; return str.startsWith((_a = args[1]) !== null && _a !== void 0 ? _a : ''); });
                }
                return undefined;
            }
        };
        internalState.registerPlugin(this);
        this.messageBus.emit('mongosh-snippets:loaded', { installdir });
    }
    get messageBus() {
        return this._internalState.messageBus;
    }
    async prepareNpm() {
        var _a, _b, _c;
        const npmdir = path_1.default.join(this.installdir, 'node_modules', 'npm');
        const npmclipath = path_1.default.join(npmdir, 'bin', 'npm-cli.js');
        await fs_1.promises.mkdir(this.installdir, { recursive: true });
        try {
            await fs_1.promises.stat(npmclipath);
            this.messageBus.emit('mongosh-snippets:npm-lookup', { existingVersion: '<local>' });
            return [process.execPath, npmclipath];
        }
        catch (_d) { }
        try {
            const { stdout } = await execFile('npm', ['--version'], { encoding: 'utf8' });
            this.messageBus.emit('mongosh-snippets:npm-lookup', { existingVersion: stdout.trim() });
            const major = +stdout.trim().split('.')[0];
            if (major >= 6)
                return ['npm'];
        }
        catch (_e) { }
        const { evaluationListener, interrupted } = this._internalState;
        await interrupted.checkpoint();
        const result = await ((_a = evaluationListener.onPrompt) === null || _a === void 0 ? void 0 : _a.call(evaluationListener, 'This operation requires downloading a recent release of npm. Do you want to proceed? [Y/n]', 'yesno'));
        if (result === 'no') {
            this.messageBus.emit('mongosh-snippets:npm-lookup-stopped');
            throw new errors_1.MongoshRuntimeError('Stopped by user request');
        }
        const npmMetadataURL = (await this.registryBaseUrl()) + '/npm/latest';
        await interrupted.checkpoint();
        const npmMetadataResponse = await node_fetch_1.default(npmMetadataURL);
        if (!npmMetadataResponse.ok) {
            this.messageBus.emit('mongosh-snippets:npm-download-failed', { npmMetadataURL, status: npmMetadataResponse.status });
            throw new errors_1.MongoshRuntimeError(`Failed to download npm: ${npmMetadataURL}: ${npmMetadataResponse.statusText}`);
        }
        await interrupted.checkpoint();
        const npmTarballURL = (_c = (_b = (await npmMetadataResponse.json())) === null || _b === void 0 ? void 0 : _b.dist) === null || _c === void 0 ? void 0 : _c.tarball;
        if (!npmTarballURL) {
            this.messageBus.emit('mongosh-snippets:npm-download-failed', { npmMetadataURL, npmTarballURL });
            throw new errors_1.MongoshRuntimeError(`Failed to download npm: ${npmMetadataURL}: Registry returned no download source`);
        }
        await interrupted.checkpoint();
        await this.print(`Downloading npm from ${npmTarballURL}...`);
        const npmTarball = await node_fetch_1.default(npmTarballURL);
        if (!npmTarball.ok) {
            this.messageBus.emit('mongosh-snippets:npm-download-failed', { npmMetadataURL, npmTarballURL, status: npmTarball.status });
            throw new errors_1.MongoshRuntimeError(`Failed to download npm: ${npmTarballURL}: ${npmTarball.statusText}`);
        }
        this.messageBus.emit('mongosh-snippets:npm-download-active', { npmMetadataURL, npmTarballURL });
        await interrupted.checkpoint();
        await fs_1.promises.mkdir(npmdir, { recursive: true });
        await pipeline(npmTarball.body, tar_1.default.x({ strip: 1, C: npmdir }));
        await this.editPackageJSON((pjson) => { var _a; ((_a = pjson.dependencies) !== null && _a !== void 0 ? _a : (pjson.dependencies = {})).npm = '*'; });
        return [process.execPath, npmclipath];
    }
    async prepareIndex(refreshMode = 'allow-cached') {
        var _a;
        return this.repos = await ((_a = this.inflightFetchIndexPromise) !== null && _a !== void 0 ? _a : (this.inflightFetchIndexPromise = (async () => {
            this.messageBus.emit('mongosh-snippets:fetch-index', { refreshMode });
            const cachePath = path_1.default.join(this.installdir, 'index.bson.br');
            await fs_1.promises.mkdir(this.installdir, { recursive: true });
            let repoData = null;
            let fetchedFromNetwork = false;
            try {
                repoData = (await unpackBSON(await fs_1.promises.readFile(cachePath))).repoData;
            }
            catch (_a) { }
            if (!repoData || refreshMode === 'force-refresh') {
                fetchedFromNetwork = true;
                const urls = (await this.config.get('snippetIndexSourceURLs')).split(';').filter(Boolean);
                repoData = await Promise.all(urls.map(async (url) => {
                    const repoRes = await node_fetch_1.default(url);
                    if (!repoRes.ok) {
                        this.messageBus.emit('mongosh-snippets:fetch-index-error', { action: 'fetch', url, status: repoRes.status });
                        throw new errors_1.MongoshRuntimeError(`The specified index file ${url} could not be read: ${repoRes.statusText}`);
                    }
                    const rawData = await repoRes.buffer();
                    let data;
                    try {
                        data = await unpackBSON(rawData);
                    }
                    catch (err) {
                        this.messageBus.emit('mongosh-snippets:fetch-index-error', { action: 'parse-fetched', url, error: err.message });
                        throw new errors_1.MongoshRuntimeError(`The specified index file ${url} could not be parsed: ${err.message}`);
                    }
                    const { error } = indexFileSchema.validate(data, { allowUnknown: true });
                    if (error) {
                        this.messageBus.emit('mongosh-snippets:fetch-index-error', { action: 'validate-fetched', url, error: error.message });
                        throw new errors_1.MongoshRuntimeError(`The specified index file ${url} is not a valid index file: ${error.message}`);
                    }
                    return { ...data, sourceURL: url };
                }));
                try {
                    await fs_1.promises.writeFile(cachePath, await packBSON({ repoData }));
                }
                catch (err) {
                    this.messageBus.emit('mongosh-snippets:fetch-index-error', { action: 'save', error: err.message });
                }
            }
            this.messageBus.emit('mongosh-snippets:fetch-index-done');
            this.inflightFetchIndexPromise = null;
            if (!fetchedFromNetwork && (Date.now() - (await fs_1.promises.stat(cachePath)).mtime.getTime() > 3600000)) {
                this.prepareIndex('force-refresh').catch(() => { });
            }
            return repoData;
        })()));
    }
    get snippets() {
        var _a, _b;
        return (_b = (_a = this.repos) === null || _a === void 0 ? void 0 : _a.flatMap((repository) => repository.index)) !== null && _b !== void 0 ? _b : [];
    }
    async registryBaseUrl() {
        return await this.config.get('snippetRegistryURL');
    }
    async ensureSetup() {
        if (this.npmArgv.length > 0 && this.repos) {
            return this.npmArgv;
        }
        await this._internalState.interrupted.checkpoint();
        [this.npmArgv, this.repos] = await Promise.all([
            this.prepareNpm(),
            this.prepareIndex()
        ]);
        return this.npmArgv;
    }
    async editPackageJSON(fn) {
        let pjson = {};
        try {
            pjson = JSON.parse(await fs_1.promises.readFile(path_1.default.join(this.installdir, 'package.json'), 'utf8'));
        }
        catch (err) {
            this.messageBus.emit('mongosh-snippets:package-json-edit-error', { error: err.message });
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
        const origContent = JSON.parse(JSON.stringify(pjson));
        const result = await fn(pjson);
        if (!util_1.isDeepStrictEqual(origContent, result)) {
            await fs_1.promises.writeFile(path_1.default.join(this.installdir, 'package.json'), JSON.stringify(pjson, null, '  '));
        }
        return result;
    }
    async runNpm(...npmArgs) {
        const { interrupted } = this._internalState;
        await this.editPackageJSON(() => { });
        const [cmd, ...args] = [
            ...await this.ensureSetup(),
            '--no-package-lock',
            '--ignore-scripts',
            `--registry=${await this.registryBaseUrl()}`,
            ...npmArgs
        ];
        this.messageBus.emit('mongosh-snippets:run-npm', { args: [cmd, ...args] });
        await interrupted.checkpoint();
        const proc = child_process_1.default.spawn(cmd, args, {
            cwd: this.installdir,
            env: { ...process.env, MONGOSH_RUN_NODE_SCRIPT: '1' }
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
        proc.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
        try {
            console.log('starting listening on interrupted.asPromise()');
            const [exitCode] = await Promise.race([
                interrupted.asPromise(),
                events_1.once(proc, 'close')
            ]);
            if (exitCode === 0 || (exitCode === 1 && stderr === '' && stdout)) {
                return stdout;
            }
            throw new Error(`Command failed: ${[cmd, ...args].join(' ')} with exit code ${exitCode}: ${stderr} ${stdout}`);
        }
        finally {
            console.log('npm proc exited with', proc.exitCode, proc.signalCode);
            if (proc.exitCode === null && proc.signalCode === null) {
                proc.kill();
            }
        }
    }
    async search() {
        await this.ensureSetup();
        const list = this.snippets.map(({ snippetName, version, description }) => ({ name: snippetName, version, description }));
        const tableOutput = new stream_1.PassThrough({ encoding: 'utf8' });
        new console_1.Console(tableOutput).table(list);
        return tableOutput.read();
    }
    async loadAllSnippets(autoloadMode = 'only-autoload') {
        if (autoloadMode === 'only-autoload' && !await this.config.get('snippetAutoload')) {
            return;
        }
        let installedPackages;
        try {
            installedPackages = await this.editPackageJSON((pjson) => { var _a; return Object.keys((_a = pjson.dependencies) !== null && _a !== void 0 ? _a : {}); });
        }
        catch (err) {
            if (autoloadMode === 'only-autoload') {
                return;
            }
            throw err;
        }
        for (const name of installedPackages) {
            if (name === 'npm') {
                continue;
            }
            const packagePath = path_1.default.resolve(this.installdir, 'node_modules', name);
            this.messageBus.emit('mongosh-snippets:load-snippet', { source: 'load-all', name });
            await this._internalState.interrupted.checkpoint();
            await this.load(require.resolve(packagePath));
        }
    }
    async runSnippetCommand(args) {
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
                    output = await this.runNpm('ls', '--depth=0');
                }
                else {
                    output = await this.runNpm(args[0]);
                }
                for (const { name, snippetName } of this.snippets) {
                    output = output.replace(new RegExp(escape_string_regexp_1.default(name), 'g'), `mongosh:${snippetName}`);
                }
                return output;
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
    async runInstallLikeCmd(args) {
        var _a;
        const { evaluationListener } = this._internalState;
        await this.ensureSetup();
        const snippetDescs = [];
        for (let i = 1; i < args.length; i++) {
            const snippetDesc = this.snippets.find(({ snippetName }) => snippetName === args[i]);
            if (!snippetDesc) {
                throw new errors_1.MongoshInvalidInputError(`Unknown snippet "${args[i]}"`);
            }
            snippetDescs.push(snippetDesc);
        }
        await this.editPackageJSON((pjson) => {
            var _a;
            for (const { name } of snippetDescs) {
                ((_a = pjson.dependencies) !== null && _a !== void 0 ? _a : (pjson.dependencies = {}))[name] = args[0] === 'uninstall' ? undefined : '*';
            }
        });
        const npmArguments = snippetDescs.map(({ name, installSpec }) => {
            return name + (args[0] === 'install' && installSpec ? `@${installSpec}` : '');
        });
        await this.print(`Running ${args[0]}...`);
        await this.runNpm(args[0], '--save', ...npmArguments);
        if (args[0] === 'install' && snippetDescs.length > 0) {
            await this._internalState.interrupted.checkpoint();
            const loadNow = await ((_a = evaluationListener.onPrompt) === null || _a === void 0 ? void 0 : _a.call(evaluationListener, `Installed new snippets ${args.slice(1)}. Do you want to load them now? [Y/n]`, 'yesno'));
            if (loadNow !== 'no') {
                for (const { name } of snippetDescs) {
                    this.messageBus.emit('mongosh-snippets:load-snippet', { source: 'install', name });
                    await this._internalState.interrupted.checkpoint();
                    await this.load(require.resolve(path_1.default.join(this.installdir, 'node_modules', name)));
                }
            }
            return `Finished installing snippets: ${args.slice(1)}`;
        }
        return 'Done!';
    }
    async helpText(snippet = '') {
        if (snippet) {
            await this.prepareIndex();
            const info = this.snippets.find(({ snippetName }) => snippetName === snippet);
            if (!info) {
                throw new errors_1.MongoshInvalidInputError(`Unknown snippet "${snippet}"`);
            }
            if (!info.readme) {
                throw new errors_1.MongoshRuntimeError(`No help information available for "${snippet}"`);
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
    async showInfo() {
        var _a, _b;
        await this.prepareIndex();
        return (_b = (_a = this.repos) === null || _a === void 0 ? void 0 : _a.map(repository => `\
Snippet repository URL:      ${repository.sourceURL}
  -->  Homepage:             ${repository.metadata.homepage}
`).join('\n')) !== null && _b !== void 0 ? _b : 'Not enabled';
    }
    transformError(err) {
        if (!this.repos)
            return err;
        for (const { errorMatchers, name } of this.snippets) {
            for (const { matches, message } of errorMatchers !== null && errorMatchers !== void 0 ? errorMatchers : []) {
                for (const regexp of matches) {
                    if (err.message.match(regexp)) {
                        this.messageBus.emit('mongosh-snippets:transform-error', { error: err.message, addition: message, name });
                        err.message += ` (${message})`;
                        return err;
                    }
                }
            }
        }
        return err;
    }
}
exports.SnippetManager = SnippetManager;
//# sourceMappingURL=snippet-manager.js.map