import {
  shellApiClassDefault,
  ShellApiClass,
  returnsPromise,
  returnType,
  platforms,
  toShellResult,
  ShellResult,
  directShellCommand,
  shellCommandCompleter,
  ShellCommandAutocompleteParameters
} from './decorators';
import { asPrintable } from './enums';
import Mongo from './mongo';
import Database from './database';
import { CommandResult, CursorIterationResult } from './result';
import type ShellInstanceState from './shell-instance-state';
import { assertArgsDefinedType, assertCLI } from './helpers';
import { DEFAULT_DB, ServerApi, ServerApiVersion } from '@mongosh/service-provider-core';
import { CommonErrors, MongoshUnimplementedError, MongoshInternalError } from '@mongosh/errors';
import { DBQuery } from './dbquery';
import { promisify } from 'util';
import { ClientSideFieldLevelEncryptionOptions } from './field-level-encryption';
import { dirname } from 'path';
import { ShellUserConfig } from '@mongosh/types';
import i18n from '@mongosh/i18n';

const instanceStateSymbol = Symbol.for('@@mongosh.instanceState');
const loadCallNestingLevelSymbol = Symbol.for('@@mongosh.loadCallNestingLevel');

/**
 * Class for representing the `config` object in mongosh.
 */
@shellApiClassDefault
class ShellConfig extends ShellApiClass {
  _instanceState: ShellInstanceState;
  defaults: Readonly<ShellUserConfig>;

  constructor(instanceState: ShellInstanceState) {
    super();
    this._instanceState = instanceState;
    this.defaults = Object.freeze(new ShellUserConfig());
  }

  @returnsPromise
  async set<K extends keyof ShellUserConfig>(key: K, value: ShellUserConfig[K]): Promise<string> {
    assertArgsDefinedType([key], ['string'], 'config.set');
    const { evaluationListener } = this._instanceState;
    // Only allow known config keys here:
    const isValidKey = (await this._allKeys()).includes(key);
    if (isValidKey) {
      const validationResult = await evaluationListener.validateConfig?.(key, value);
      if (validationResult) {
        return `Cannot set option "${key}": ${validationResult}`;
      }
    }
    const result = isValidKey && await evaluationListener.setConfig?.(key, value);
    if (result !== 'success') {
      return `Option "${key}" is not available in this environment`;
    }

    return `Setting "${key}" has been changed`;
  }

  @returnsPromise
  async get<K extends keyof ShellUserConfig>(key: K): Promise<ShellUserConfig[K]> {
    assertArgsDefinedType([key], ['string'], 'config.get');
    const { evaluationListener } = this._instanceState;
    return await evaluationListener.getConfig?.(key) ?? this.defaults[key];
  }

  @returnsPromise
  async reset<K extends keyof ShellUserConfig>(key: K): Promise<string> {
    assertArgsDefinedType([key], ['string'], 'config.reset');
    const { evaluationListener } = this._instanceState;
    const result = await evaluationListener.resetConfig?.(key);
    if (result !== 'success') {
      return `Option "${key}" cannot be changed in this environment`;
    }

    return `Setting "${key}" has been reset to its default value`;
  }

  async _allKeys(): Promise<(keyof ShellUserConfig)[]> {
    const { evaluationListener } = this._instanceState;
    return (await evaluationListener.listConfigOptions?.() ?? Object.keys(this.defaults)) as (keyof ShellUserConfig)[];
  }

  async [asPrintable](): Promise<Map<keyof ShellUserConfig, ShellUserConfig[keyof ShellUserConfig]>> {
    return new Map(
      await Promise.all(
        (await this._allKeys()).map(
          async key => [key, await this.get(key)] as const)));
  }
}

/**
 * Complete e.g. `use adm` by returning `['admin']`.
 */
async function useCompleter(params: ShellCommandAutocompleteParameters, args: string[]): Promise<string[] | undefined> {
  if (args.length > 2) return undefined;
  return await params.getDatabaseCompletions(args[1] ?? '');
}

/**
 * Complete a `show` subcommand.
 */
// eslint-disable-next-line @typescript-eslint/require-await
async function showCompleter(params: ShellCommandAutocompleteParameters, args: string[]): Promise<string[] | undefined> {
  if (args.length > 2) return undefined;
  if (args[1] === 'd') {
    // Special-case: The user might want `show dbs` or `show databases`, but they won't care about which they get.
    return ['databases'];
  }
  const candidates = [
    'databases', 'dbs', 'collections', 'tables', 'profile', 'users', 'roles', 'log', 'logs',
    'startupWarnings', 'automationNotices', 'nonGenuineMongoDBCheck'
  ];
  return candidates.filter(str => str.startsWith(args[1] ?? ''));
}

/**
 * This class contains all the *global* properties that are considered part
 * of the immediate shell API. Some of these properties are decorated with
 * {@link directShellCommand}, which means that they will be usable without
 * parentheses (`use foo` as an alias for `use('foo')`, for example).
 * Those also specify a custom autocompletion helper.
 */
@shellApiClassDefault
export default class ShellApi extends ShellApiClass {
  // Use symbols to make sure these are *not* among the things copied over into
  // the global scope.
  [instanceStateSymbol]: ShellInstanceState;
  [loadCallNestingLevelSymbol]: number;
  DBQuery: DBQuery;
  config: ShellConfig;

  constructor(instanceState: ShellInstanceState) {
    super();
    this[instanceStateSymbol] = instanceState;
    this[loadCallNestingLevelSymbol] = 0;
    this.DBQuery = new DBQuery(instanceState);
    this.config = new ShellConfig(instanceState);
  }

  get _instanceState(): ShellInstanceState {
    return this[instanceStateSymbol];
  }

  get loadCallNestingLevel(): number {
    return this[loadCallNestingLevelSymbol];
  }

  set loadCallNestingLevel(value: number) {
    this[loadCallNestingLevelSymbol] = value;
  }

  @directShellCommand
  @shellCommandCompleter(useCompleter)
  use(db: string): any {
    return this._instanceState.currentDb._mongo.use(db);
  }

  @directShellCommand
  @returnsPromise
  @shellCommandCompleter(showCompleter)
  async show(cmd: string, arg?: string): Promise<CommandResult> {
    return await this._instanceState.currentDb._mongo.show(cmd, arg);
  }

  @directShellCommand
  @returnsPromise
  @platforms([ 'CLI' ] )
  async exit(exitCode?: number): Promise<never> {
    assertArgsDefinedType([exitCode], [[undefined, 'number']], 'exit');
    assertCLI(this._instanceState.initialServiceProvider.platform, 'the exit/quit commands');
    await this._instanceState.close(true);
    // This should never actually return.
    await this._instanceState.evaluationListener.onExit?.(exitCode);
    throw new MongoshInternalError('.onExit listener returned');
  }

  @directShellCommand
  @returnsPromise
  @platforms([ 'CLI' ] )
  async quit(exitCode?: number): Promise<never> {
    return await this.exit(exitCode);
  }

  @returnsPromise
  @returnType('Mongo')
  @platforms([ 'CLI' ] )
  public async Mongo(
    uri?: string,
    fleOptions?: ClientSideFieldLevelEncryptionOptions,
    otherOptions?: { api?: ServerApi | ServerApiVersion }): Promise<Mongo> {
    assertCLI(this._instanceState.initialServiceProvider.platform, 'new Mongo connections');
    const mongo = new Mongo(this._instanceState, uri, fleOptions, otherOptions);
    await mongo.connect();
    this._instanceState.mongos.push(mongo);
    return mongo;
  }

  @returnsPromise
  @returnType('Database')
  @platforms([ 'CLI' ] )
  async connect(uri: string, user?: string, pwd?: string): Promise<Database> {
    assertArgsDefinedType([uri, user, pwd], ['string', [undefined, 'string'], [undefined, 'string']], 'connect');
    assertCLI(this._instanceState.initialServiceProvider.platform, 'new Mongo connections');
    const mongo = new Mongo(this._instanceState, uri);
    await mongo.connect(user, pwd);
    this._instanceState.mongos.push(mongo);
    const db = mongo._serviceProvider.initialDb || DEFAULT_DB;
    return mongo.getDB(db);
  }

  @directShellCommand
  @returnsPromise
  async it(): Promise<any> {
    if (!this._instanceState.currentCursor) {
      return new CursorIterationResult();
    }
    return await this._instanceState.currentCursor._it();
  }

  version(): string {
    const version = require('../package.json').version;
    return version;
  }

  @returnsPromise
  async load(filename: string): Promise<true> {
    assertArgsDefinedType([filename], ['string'], 'load');
    if (!this._instanceState.evaluationListener.onLoad) {
      throw new MongoshUnimplementedError(
        'load is not currently implemented for this platform',
        CommonErrors.NotImplemented
      );
    }
    this._instanceState.messageBus.emit('mongosh:api-load-file', {
      nested: this.loadCallNestingLevel > 0,
      filename
    });
    const {
      resolvedFilename, evaluate
    } = await this._instanceState.evaluationListener.onLoad(filename);

    const context = this._instanceState.context;
    const previousFilename = context.__filename;
    context.__filename = resolvedFilename;
    context.__dirname = dirname(resolvedFilename);
    this.loadCallNestingLevel++;
    try {
      await evaluate();
    } finally {
      this.loadCallNestingLevel--;
      if (previousFilename) {
        context.__filename = previousFilename;
        context.__dirname = dirname(previousFilename);
      } else {
        delete context.__filename;
        delete context.__dirname;
      }
    }
    return true;
  }

  @returnsPromise
  @platforms([ 'CLI' ] )
  async enableTelemetry(): Promise<any> {
    const result = await this._instanceState.evaluationListener.setConfig?.('enableTelemetry', true);
    if (result === 'success') {
      return i18n.__('cli-repl.cli-repl.enabledTelemetry');
    }
  }

  @returnsPromise
  @platforms([ 'CLI' ] )
  async disableTelemetry(): Promise<any> {
    const result = await this._instanceState.evaluationListener.setConfig?.('enableTelemetry', false);
    if (result === 'success') {
      return i18n.__('cli-repl.cli-repl.disabledTelemetry');
    }
  }

  @returnsPromise
  @platforms([ 'CLI' ] )
  async passwordPrompt(): Promise<string> {
    const { evaluationListener } = this._instanceState;
    if (!evaluationListener.onPrompt) {
      throw new MongoshUnimplementedError('passwordPrompt() is not available in this shell', CommonErrors.NotImplemented);
    }
    return await evaluationListener.onPrompt('Enter password', 'password');
  }

  @returnsPromise
  async sleep(ms: number): Promise<void> {
    return await promisify(setTimeout)(ms);
  }

  private async _print(origArgs: any[], type: 'print' | 'printjson'): Promise<void> {
    const { evaluationListener } = this._instanceState;
    const args: ShellResult[] = await Promise.all(
      origArgs.map((arg) => toShellResult(arg))
    );
    await evaluationListener.onPrint?.(args, type);
  }

  @returnsPromise
  async print(...origArgs: any[]): Promise<void> {
    await this._print(origArgs, 'print');
  }

  @returnsPromise
  async printjson(...origArgs: any[]): Promise<void> {
    await this._print(origArgs, 'printjson');
  }

  @returnsPromise
  async convertShardKeyToHashed(value: any): Promise<unknown> {
    return this._instanceState.currentDb._mongo.convertShardKeyToHashed(value);
  }

  @directShellCommand
  @returnsPromise
  async cls(): Promise<void> {
    const { evaluationListener } = this._instanceState;
    await evaluationListener.onClearCommand?.();
  }

  isInteractive(): boolean {
    return this._instanceState.isInteractive;
  }
}
