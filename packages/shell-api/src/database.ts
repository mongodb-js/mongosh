import type Mongo from './mongo';
import type { CollectionWithSchema } from './collection';
import { Collection } from './collection';
import {
  returnsPromise,
  returnType,
  serverVersions,
  apiVersions,
  shellApiClassDefault,
  topologies,
  deprecated,
  ShellApiWithMongoClass,
} from './decorators';
import { asPrintable, ServerVersions } from './enums';
import type {
  GenericDatabaseSchema,
  GenericServerSideSchema,
  StringKey,
} from './helpers';
import {
  adaptAggregateOptions,
  adaptOptions,
  assertArgsDefinedType,
  assertKeysDefined,
  getPrintableShardStatus,
  processDigestPassword,
  tsToSeconds,
  isValidCollectionName,
  getConfigDB,
  shouldRunAggregationImmediately,
  adjustRunCommand,
  getBadge,
  aggregateBackgroundOptionNotSupportedHelp,
} from './helpers';

import {
  type ChangeStreamOptions,
  type CommandOperationOptions,
  type CreateCollectionOptions,
  type Document,
  type WriteConcern,
  type ListCollectionsOptions,
} from '@mongosh/service-provider-core';
import { AggregationCursor, RunCommandCursor, CommandResult } from './index';
import {
  CommonErrors,
  MongoshDeprecatedError,
  MongoshInvalidInputError,
  MongoshRuntimeError,
  MongoshUnimplementedError,
  MongoshInternalError,
} from '@mongosh/errors';
import { shouldRedactCommand } from 'mongodb-redact';
import type Session from './session';
import ChangeStreamCursor from './change-stream-cursor';
import { ShellApiErrors } from './error-codes';
import type {
  CreateEncryptedCollectionOptions,
  CheckMetadataConsistencyOptions,
  RunCommandOptions,
  ExplainVerbosityLike,
  AggregateOptions,
} from '@mongosh/service-provider-core';
import type { MQLPipeline } from './mql-types';

export type CollectionNamesWithTypes = {
  name: string;
  badge: string;
};

type AuthDoc = {
  user: string;
  pwd: string;
  authDb?: string;
  mechanism?: string;
};

export type DatabaseWithSchema<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = GenericDatabaseSchema
> = Database<M, D> & {
  [k in StringKey<D>]: Collection<M, D, D[k], k>;
};

@shellApiClassDefault
export class Database<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = GenericDatabaseSchema
> extends ShellApiWithMongoClass {
  _mongo: Mongo<M>;
  _name: StringKey<M>;
  _collections: Record<StringKey<D>, CollectionWithSchema<M, D>>;
  _session: Session | undefined;
  _cachedCollectionNames: StringKey<D>[] = [];
  _cachedHello: Document | null = null;

  constructor(mongo: Mongo<M>, name: StringKey<M>, session?: Session) {
    super();
    this._mongo = mongo;
    this._name = name;
    const collections: Record<
      string,
      CollectionWithSchema<M, D>
    > = Object.create(null);
    this._collections = collections;
    this._session = session;
    const proxy = new Proxy(this, {
      get: (target, prop): any => {
        if (prop in target) {
          return (target as any)[prop];
        }

        if (
          typeof prop !== 'string' ||
          prop.startsWith('_') ||
          !isValidCollectionName(prop)
        ) {
          return;
        }

        if (!collections[prop]) {
          collections[prop] = new Collection<M, D>(
            mongo,
            proxy,
            prop
          ) as CollectionWithSchema<M, D>;
        }

        return collections[prop];
      },
    });
    return proxy;
  }

  async _baseOptions(): Promise<CommandOperationOptions> {
    const options: CommandOperationOptions = {};
    if (this._session) {
      options.session = this._session._session;
    }
    const maxTimeMS = await this._instanceState.shellApi.config.get(
      'maxTimeMS'
    );
    if (typeof maxTimeMS === 'number') {
      options.maxTimeMS = maxTimeMS;
    }
    return options;
  }

  async _maybeCachedHello(): Promise<Document> {
    return this._cachedHello ?? (await this.hello());
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return this._name;
  }

  /**
   * Internal helper for emitting database API call events.
   *
   * @param methodName
   * @param methodArguments
   * @private
   */
  private _emitDatabaseApiCall(
    methodName: string,
    methodArguments: Document = {}
  ): void {
    this._mongo._instanceState.emitApiCallWithArgs({
      method: methodName,
      class: 'Database',
      db: this._name,
      arguments: methodArguments,
    });
  }

  // Private helpers to avoid sending telemetry events for internal calls. Public so rs/sh can use them
  public async _runCommand(
    cmd: Document,
    options: CommandOperationOptions = {}
  ): Promise<Document> {
    return this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      adjustRunCommand(cmd, this._instanceState.shellBson),
      {
        ...(await this._baseOptions()),
        ...options,
      }
    );
  }

  // Private helpers to avoid sending telemetry events for internal calls. Public so rs/sh can use them
  public async _runReadCommand(
    cmd: Document,
    options: CommandOperationOptions = {}
  ): Promise<Document> {
    return this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      adjustRunCommand(cmd, this._instanceState.shellBson),
      {
        ...this._mongo._getExplicitlyRequestedReadPref(),
        ...(await this._baseOptions()),
        ...options,
      }
    );
  }

  public async _runAdminCommand(
    cmd: Document,
    options: CommandOperationOptions = {}
  ): Promise<Document> {
    return this.getSiblingDB('admin')._runCommand(cmd, options);
  }

  public async _runAdminReadCommand(
    cmd: Document,
    options: CommandOperationOptions = {}
  ): Promise<Document> {
    return this.getSiblingDB('admin')._runReadCommand(cmd, options);
  }

  public async _runCursorCommand(
    cmd: Document,
    options: CommandOperationOptions = {}
  ): Promise<RunCommandCursor> {
    const providerCursor = this._mongo._serviceProvider.runCursorCommand(
      this._name,
      adjustRunCommand(cmd, this._instanceState.shellBson),
      {
        ...this._mongo._getExplicitlyRequestedReadPref(),
        ...(await this._baseOptions()),
        ...options,
      }
    );

    const cursor = new RunCommandCursor(this._mongo, providerCursor);
    this._mongo._instanceState.currentCursor = cursor;
    return cursor;
  }

  public async _runAdminCursorCommand(
    cmd: Document,
    options: CommandOperationOptions = {}
  ): Promise<RunCommandCursor> {
    return this.getSiblingDB('admin')._runCursorCommand(cmd, options);
  }

  async _listCollections(
    filter: Document,
    options: ListCollectionsOptions
  ): Promise<Document[]> {
    return (
      (await this._mongo._serviceProvider.listCollections(this._name, filter, {
        ...this._mongo._getExplicitlyRequestedReadPref(),
        ...(await this._baseOptions()),
        ...options,
      })) || []
    );
  }

  async _getCollectionNames(
    options?: ListCollectionsOptions
  ): Promise<string[]> {
    const infos = await this._listCollections(
      {},
      { ...options, nameOnly: true }
    );
    this._cachedCollectionNames = infos.map(
      (collection: any) => collection.name
    );
    return this._cachedCollectionNames;
  }

  async _getCollectionNamesWithTypes(
    options?: ListCollectionsOptions
  ): Promise<CollectionNamesWithTypes[]> {
    let collections = await this._listCollections(
      {},
      { ...options, nameOnly: true }
    );
    collections = collections.sort((c1, c2) => c1.name.localeCompare(c2.name));

    this._cachedCollectionNames = collections.map(
      (collection: Document) => collection.name
    );

    return collections.map((collection: Document, index: number) => ({
      name: collection.name,
      badge: getBadge(collections, index),
    }));
  }

  async _getCollectionNamesForCompletion(): Promise<string[]> {
    return await Promise.race([
      (async () => {
        const result = await this._getCollectionNames({
          readPreference: 'primaryPreferred',
        });
        this._mongo._instanceState.messageBus.emit(
          'mongosh:load-collections-complete'
        );
        return result;
      })(),
      (async () => {
        // 200ms should be a good compromise between giving the server a chance
        // to reply and responsiveness for human perception. It's not the end
        // of the world if we end up using the cached results; usually, they
        // are not going to differ from fresh ones, and even if they do, a
        // subsequent autocompletion request will almost certainly have at least
        // the new cached results.
        await new Promise((resolve) => setTimeout(resolve, 200)?.unref?.());
        return this._cachedCollectionNames;
      })(),
    ]);
  }

  async _getLastErrorObj(
    w?: number | string,
    wTimeout?: number,
    j?: boolean
  ): Promise<Document> {
    const cmd = { getlasterror: 1 } as any;
    if (w) {
      cmd.w = w;
    }
    if (wTimeout) {
      cmd.wtimeout = wTimeout;
    }
    if (j !== undefined) {
      cmd.j = j;
    }
    try {
      return await this._mongo._serviceProvider.runCommand(
        this._name,
        cmd,
        await this._baseOptions()
      );
    } catch (e: any) {
      return e;
    }
  }

  @returnType('Mongo')
  getMongo(): Mongo<M> {
    return this._mongo;
  }

  getName(): StringKey<M> {
    return this._name;
  }

  /**
   * Returns an array of collection names
   *
   * @return {Promise}
   */
  @returnsPromise
  @apiVersions([1])
  async getCollectionNames(): Promise<StringKey<D>[]> {
    this._emitDatabaseApiCall('getCollectionNames');
    return (await this._getCollectionNames()) as StringKey<D>[];
  }

  /**
   * Returns an array of collection infos
   *
   * @param {Document} filter - The filter.
   * @param {Document} options - The options.
   *
   * @return {Promise}
   */
  @returnsPromise
  @serverVersions(['3.0.0', ServerVersions.latest])
  @apiVersions([1])
  async getCollectionInfos(
    filter: Document = {},
    options: ListCollectionsOptions = {}
  ): Promise<Document[]> {
    this._emitDatabaseApiCall('getCollectionInfos', { filter, options });
    return await this._listCollections(filter, options);
  }

  /**
   * Run a command against the db.
   *
   * @param cmd - the command as a string or spec document.
   *
   * @returns The promise of command results.
   */
  @returnsPromise
  @apiVersions([1])
  async runCommand(
    cmd: string | Document,
    options?: RunCommandOptions
  ): Promise<Document> {
    assertArgsDefinedType([cmd], [['string', 'object']], 'Database.runCommand');
    if (typeof cmd === 'string') {
      cmd = { [cmd]: 1 };
    }

    try {
      if (!Object.keys(cmd).some((k) => shouldRedactCommand(k))) {
        this._emitDatabaseApiCall('runCommand', { cmd, options });
      }
      return await this._runCommand(cmd, options);
    } catch (error: any) {
      if (error.codeName === 'NotPrimaryNoSecondaryOk') {
        const message = `not primary - consider passing the readPreference option e.g. db.runCommand({ command }, { readPreference: "secondaryPreferred" })`;
        (error as Error).message = message;
      }
      throw error;
    }
  }

  /**
   * Run a command against the admin db.
   *
   * @param cmd - the command as a string or spec document.
   *
   * @returns The promise of command results.
   */
  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  @apiVersions([1])
  async adminCommand(cmd: string | Document): Promise<Document> {
    assertArgsDefinedType(
      [cmd],
      [['string', 'object']],
      'Database.adminCommand'
    );
    if (typeof cmd === 'string') {
      cmd = { [cmd]: 1 };
    }

    if (!Object.keys(cmd).some((k) => shouldRedactCommand(k))) {
      this._emitDatabaseApiCall('adminCommand', { cmd });
    }
    return await this._runAdminCommand(cmd, {});
  }

  /**
   * Run an aggregation against the database. Accepts array pipeline and options object OR stages as individual arguments.
   *
   * @returns {Promise} The promise of aggregation results.
   */
  async aggregate(
    pipeline: MQLPipeline,
    options: AggregateOptions & { explain: ExplainVerbosityLike }
  ): Promise<Document>;
  async aggregate(
    pipeline: MQLPipeline,
    options?: AggregateOptions
  ): Promise<AggregationCursor>;
  async aggregate(...stages: MQLPipeline): Promise<AggregationCursor>;
  @returnsPromise
  @returnType('AggregationCursor')
  @apiVersions([1])
  async aggregate(...args: unknown[]): Promise<AggregationCursor | Document> {
    let options: AggregateOptions;
    let pipeline: MQLPipeline;
    if (args.length === 0 || Array.isArray(args[0])) {
      options = args[1] || {};
      pipeline = (args[0] as MQLPipeline) || [];
    } else {
      options = {};
      pipeline = (args as MQLPipeline) || [];
    }

    if ('background' in options) {
      await this._instanceState.printWarning(
        aggregateBackgroundOptionNotSupportedHelp
      );
    }

    assertArgsDefinedType([pipeline], [true], 'Database.aggregate');

    this._emitDatabaseApiCall('aggregate', { options, pipeline });

    const { aggOptions, dbOptions, explain } = adaptAggregateOptions(options);

    const providerCursor = this._mongo._serviceProvider.aggregateDb(
      this._name,
      pipeline,
      { ...(await this._baseOptions()), ...aggOptions },
      dbOptions
    );
    const cursor = new AggregationCursor(this._mongo, providerCursor);

    if (explain) {
      await this._instanceState.printDeprecationWarning(
        'Database.aggregate(pipeline, { explain }) is deprecated and will be removed in the future.'
      );
      return await cursor.explain(explain);
    } else if (shouldRunAggregationImmediately(pipeline)) {
      await cursor.hasNext();
    }

    this._mongo._instanceState.currentCursor = cursor;
    return cursor;
  }

  @returnType('Database')
  getSiblingDB<K extends StringKey<M>>(db: K): DatabaseWithSchema<M, M[K]> {
    assertArgsDefinedType([db], ['string'], 'Database.getSiblingDB');
    this._emitDatabaseApiCall('getSiblingDB', { db });
    if (this._session) {
      return this._session.getDatabase(db) as DatabaseWithSchema<M, M[K]>;
    }
    return this._mongo._getDb(db);
  }

  @returnType('Collection')
  getCollection<K extends StringKey<D>>(
    coll: K
  ): CollectionWithSchema<M, D, D[K], K> {
    assertArgsDefinedType([coll], ['string'], 'Database.getColl');
    this._emitDatabaseApiCall('getCollection', { coll });
    if (!isValidCollectionName(coll)) {
      throw new MongoshInvalidInputError(
        `Invalid collection name: ${coll}`,
        CommonErrors.InvalidArgument
      );
    }

    const collections: Record<string, CollectionWithSchema<M, D>> = this
      ._collections;

    if (!collections[coll]) {
      collections[coll] = new Collection<M, D>(
        this._mongo,
        this,
        coll
      ) as CollectionWithSchema<M, D>;
    }

    return collections[coll] as CollectionWithSchema<M, D, D[K], K>;
  }

  @returnsPromise
  @apiVersions([1])
  async dropDatabase(writeConcern?: WriteConcern): Promise<Document> {
    return await this._mongo._serviceProvider.dropDatabase(this._name, {
      ...(await this._baseOptions()),
      writeConcern,
    });
  }

  @returnsPromise
  @apiVersions([])
  async createUser(
    user: Document,
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType([user], ['object'], 'Database.createUser');
    assertKeysDefined(user, ['user', 'roles']);

    if (this._name === '$external') {
      if ('pwd' in user) {
        throw new MongoshInvalidInputError(
          'Cannot set password for users on the $external database',
          CommonErrors.InvalidArgument
        );
      }
    } else {
      assertKeysDefined(user, ['pwd']);
    }

    this._emitDatabaseApiCall('createUser', {});
    if (user.createUser) {
      throw new MongoshInvalidInputError(
        'Cannot set createUser field in helper method',
        CommonErrors.InvalidArgument
      );
    }
    const command = adaptOptions(
      { user: 'createUser', passwordDigestor: null },
      {},
      user
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const digestPwd = await processDigestPassword(
      user.user,
      user.passwordDigestor,
      command,
      this._instanceState.currentServiceProvider
    );
    const orderedCmd = {
      createUser: command.createUser,
      ...command,
      ...digestPwd,
    };
    return await this._runCommand(orderedCmd);
  }

  @returnsPromise
  async updateUser(
    username: string,
    userDoc: Document,
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [username, userDoc],
      ['string', 'object'],
      'Database.updateUser'
    );
    this._emitDatabaseApiCall('updateUser', {});
    if (
      userDoc.passwordDigestor &&
      userDoc.passwordDigestor !== 'server' &&
      userDoc.passwordDigestor !== 'client'
    ) {
      throw new MongoshInvalidInputError(
        `Invalid field: passwordDigestor must be 'client' or 'server', got ${userDoc.passwordDigestor}`,
        CommonErrors.InvalidArgument
      );
    }

    const command = adaptOptions(
      { passwordDigestor: null },
      {
        updateUser: username,
      },
      userDoc
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const digestPwd = await processDigestPassword(
      username,
      userDoc.passwordDigestor,
      command,
      this._instanceState.currentServiceProvider
    );
    const orderedCmd = {
      updateUser: command.updateUser,
      ...command,
      ...digestPwd,
    };
    return await this._runCommand(orderedCmd);
  }

  @returnsPromise
  @apiVersions([])
  async changeUserPassword(
    username: string,
    password: string,
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [username, password],
      ['string', 'string'],
      'Database.changeUserPassword'
    );
    this._emitDatabaseApiCall('changeUserPassword', {});
    const command = adaptOptions(
      {},
      {
        updateUser: username,
        pwd: password,
      },
      {}
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }

    const orderedCmd = { updateUser: command.updateUser, ...command };
    return await this._runCommand(orderedCmd);
  }

  @returnsPromise
  @apiVersions([])
  async logout(): Promise<Document> {
    this._emitDatabaseApiCall('logout', {});
    this._mongo._instanceState.currentCursor = null;
    return await this._runCommand({ logout: 1 });
  }

  @returnsPromise
  @apiVersions([])
  async dropUser(
    username: string,
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType([username], ['string'], 'Database.dropUser');
    this._emitDatabaseApiCall('dropUser', {});
    const cmd = { dropUser: username } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async dropAllUsers(writeConcern?: WriteConcern): Promise<Document> {
    this._emitDatabaseApiCall('dropAllUsers', {});
    const cmd = { dropAllUsersFromDatabase: 1 } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async auth(
    ...args: [AuthDoc] | [string, string] | [string]
  ): Promise<{ ok: number }> {
    this._emitDatabaseApiCall('auth', {});
    let authDoc: AuthDoc;
    if (args.length === 1) {
      const { evaluationListener } = this._mongo._instanceState;
      if (typeof args[0] === 'string' && evaluationListener.onPrompt) {
        authDoc = {
          user: args[0],
          pwd: await evaluationListener.onPrompt('Enter password', 'password'),
        };
      } else {
        authDoc = args[0] as AuthDoc;
      }
    } else if (args.length === 2) {
      authDoc = {
        user: args[0],
        pwd: args[1],
      };
    } else {
      throw new MongoshInvalidInputError(
        'auth expects (username), (username, password), or ({ user: username, pwd: password })',
        CommonErrors.InvalidArgument
      );
    }
    if ((!authDoc.user || !authDoc.pwd) && !authDoc.mechanism) {
      throw new MongoshInvalidInputError(
        "auth expects user document with at least 'user' and 'pwd' or 'mechanism' fields",
        CommonErrors.InvalidArgument
      );
    }
    if ('digestPassword' in authDoc) {
      throw new MongoshUnimplementedError(
        'digestPassword is not supported for authentication.',
        CommonErrors.NotImplemented
      );
    }
    authDoc.authDb = this._name;
    this._mongo._instanceState.currentCursor = null;
    return await this._mongo._serviceProvider.authenticate(authDoc);
  }

  @returnsPromise
  @apiVersions([])
  async grantRolesToUser(
    username: string,
    roles: any[],
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [username, roles],
      ['string', true],
      'Database.grantRolesToUser'
    );
    this._emitDatabaseApiCall('grantRolesToUser', {});
    const cmd = { grantRolesToUser: username, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async revokeRolesFromUser(
    username: string,
    roles: any[],
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [username, roles],
      ['string', true],
      'Database.revokeRolesFromUser'
    );
    this._emitDatabaseApiCall('revokeRolesFromUser', {});
    const cmd = { revokeRolesFromUser: username, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async getUser(
    username: string,
    options: Document = {}
  ): Promise<Document | null> {
    assertArgsDefinedType([username], ['string'], 'Database.getUser');
    this._emitDatabaseApiCall('getUser', { username: username });
    const command = adaptOptions(
      {},
      { usersInfo: { user: username, db: this._name } },
      options
    );
    const result = await this._runReadCommand(command);
    if (result.users === undefined) {
      throw new MongoshInternalError(
        'No users were returned from the userInfo command'
      );
    }
    for (let i = 0; i < result.users.length; i++) {
      if (result.users[i].user === username) {
        return result.users[i];
      }
    }
    return null;
  }

  @returnsPromise
  @apiVersions([])
  async getUsers(options: Document = {}): Promise<Document> {
    this._emitDatabaseApiCall('getUsers', { options: options });
    const command = adaptOptions({}, { usersInfo: 1 }, options);
    return await this._runReadCommand(command);
  }

  @returnsPromise
  @apiVersions([1])
  async createCollection(
    name: string,
    options: CreateCollectionOptions = {}
  ): Promise<{ ok: number }> {
    assertArgsDefinedType([name], ['string'], 'Database.createCollection');
    this._emitDatabaseApiCall('createCollection', {
      name: name,
      options: options,
    });
    return await this._mongo._serviceProvider.createCollection(
      this._name,
      name,
      { ...(await this._baseOptions()), ...options }
    );
  }

  @returnsPromise
  @apiVersions([1])
  async createEncryptedCollection(
    name: string,
    options: CreateEncryptedCollectionOptions
  ): Promise<{ collection: Collection; encryptedFields: Document }> {
    this._emitDatabaseApiCall('createEncryptedCollection', {
      name: name,
      options: options,
    });
    return this._mongo
      .getClientEncryption()
      .createEncryptedCollection(this._name, name, options);
  }

  @returnsPromise
  @apiVersions([1])
  async createView(
    name: string,
    source: string,
    pipeline: MQLPipeline,
    options: CreateCollectionOptions = {}
  ): Promise<{ ok: number }> {
    assertArgsDefinedType(
      [name, source, pipeline],
      ['string', 'string', true],
      'Database.createView'
    );
    this._emitDatabaseApiCall('createView', {
      name,
      source,
      pipeline,
      options,
    });
    const ccOpts = {
      ...(await this._baseOptions()),
      viewOn: source,
      pipeline: pipeline,
    } as Document;
    if (options.collation) {
      ccOpts.collation = options.collation;
    }
    return await this._mongo._serviceProvider.createCollection(
      this._name,
      name,
      ccOpts
    );
  }

  @returnsPromise
  @apiVersions([])
  async createRole(
    role: Document,
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType([role], ['object'], 'Database.createRole');
    assertKeysDefined(role, ['role', 'privileges', 'roles']);
    this._emitDatabaseApiCall('createRole', {});
    if (role.createRole) {
      throw new MongoshInvalidInputError(
        'Cannot set createRole field in helper method',
        CommonErrors.InvalidArgument
      );
    }
    const command = adaptOptions({ role: 'createRole' }, {}, role);
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const orderedCmd = { createRole: command.createRole, ...command };
    return await this._runCommand(orderedCmd);
  }

  @returnsPromise
  @apiVersions([])
  async updateRole(
    rolename: string,
    roleDoc: Document,
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [rolename, roleDoc],
      ['string', 'object'],
      'Database.updateRole'
    );
    this._emitDatabaseApiCall('updateRole', {});
    const command = adaptOptions(
      {},
      {
        updateRole: rolename,
      },
      roleDoc
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const orderedCmd = { updateRole: command.updateRole, ...command };
    return await this._runCommand(orderedCmd);
  }

  @returnsPromise
  @apiVersions([])
  async dropRole(
    rolename: string,
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType([rolename], ['string'], 'Database.dropRole');
    this._emitDatabaseApiCall('dropRole', {});
    const cmd = { dropRole: rolename } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async dropAllRoles(writeConcern?: WriteConcern): Promise<Document> {
    this._emitDatabaseApiCall('dropAllRoles', {});
    const cmd = { dropAllRolesFromDatabase: 1 } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async grantRolesToRole(
    rolename: string,
    roles: any[],
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [rolename, roles],
      ['string', true],
      'Database.grantRolesToRole'
    );
    this._emitDatabaseApiCall('grantRolesToRole', {});
    const cmd = { grantRolesToRole: rolename, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async revokeRolesFromRole(
    rolename: string,
    roles: any[],
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [rolename, roles],
      ['string', true],
      'Database.revokeRolesFromRole'
    );
    this._emitDatabaseApiCall('revokeRolesFromRole', {});
    const cmd = { revokeRolesFromRole: rolename, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async grantPrivilegesToRole(
    rolename: string,
    privileges: any[],
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [rolename, privileges],
      ['string', true],
      'Database.grantPrivilegesToRole'
    );
    this._emitDatabaseApiCall('grantPrivilegesToRole', {});
    const cmd = {
      grantPrivilegesToRole: rolename,
      privileges: privileges,
    } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async revokePrivilegesFromRole(
    rolename: string,
    privileges: any[],
    writeConcern?: WriteConcern
  ): Promise<Document> {
    assertArgsDefinedType(
      [rolename, privileges],
      ['string', true],
      'Database.revokePrivilegesFromRole'
    );
    this._emitDatabaseApiCall('revokePrivilegesFromRole', {});
    const cmd = {
      revokePrivilegesFromRole: rolename,
      privileges: privileges,
    } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  @apiVersions([])
  async getRole(
    rolename: string,
    options: Document = {}
  ): Promise<Document | null> {
    assertArgsDefinedType([rolename], ['string'], 'Database.getRole');
    this._emitDatabaseApiCall('getRole', { rolename: rolename });
    const command = adaptOptions(
      {},
      { rolesInfo: { role: rolename, db: this._name } },
      options
    );
    const result = await this._runReadCommand(command);
    if (result.roles === undefined) {
      throw new MongoshInternalError(
        'No roles returned from rolesInfo command'
      );
    }
    for (let i = 0; i < result.roles.length; i++) {
      if (result.roles[i].role === rolename) {
        return result.roles[i];
      }
    }
    return null;
  }

  @returnsPromise
  @apiVersions([])
  async getRoles(options: Document = {}): Promise<Document> {
    this._emitDatabaseApiCall('getRoles', { options: options });
    const command = adaptOptions({}, { rolesInfo: 1 }, options);
    return await this._runReadCommand(command);
  }

  async _getCurrentOperations(opts: Document | boolean): Promise<Document[]> {
    const legacyCurrentOpOptions =
      typeof opts === 'boolean'
        ? { $all: opts, $ownOps: false }
        : { $all: !!opts.$all, $ownOps: !!opts.$ownOps };

    const pipeline: MQLPipeline = [
      {
        $currentOp: {
          allUsers: !legacyCurrentOpOptions.$ownOps,
          idleConnections: legacyCurrentOpOptions.$all,
          truncateOps: false,
        },
      },
    ];

    if (typeof opts === 'object') {
      const matchingFilters: Document = {};
      for (const filtername of Object.keys(opts)) {
        if (
          filtername !== '$ownOps' &&
          filtername !== '$all' &&
          filtername !== '$truncateOps'
        ) {
          matchingFilters[filtername] = opts[filtername];
        }
      }

      pipeline.push({ $match: matchingFilters });
    }

    const adminDb = this.getSiblingDB('admin');
    const aggregateOptions = {
      $readPreference: { mode: 'primaryPreferred' },
      // Regex patterns should be instances of BSONRegExp
      // as there can be issues during conversion otherwise.
      bsonRegExp: true,
    };

    try {
      const cursor = await adminDb.aggregate(pipeline, aggregateOptions);
      return await cursor.toArray();
    } catch (error) {
      if ((error as any)?.codeName === 'FailedToParse') {
        delete pipeline[0].$currentOp.truncateOps;

        const cursor = await adminDb.aggregate(pipeline, aggregateOptions);
        return await cursor.toArray();
      }
      throw error;
    }
  }

  @returnsPromise
  @apiVersions([])
  async currentOp(opts: Document | boolean = {}): Promise<Document> {
    this._emitDatabaseApiCall('currentOp', { opts: opts });
    const currentOps = await this._getCurrentOperations(opts);
    return {
      inprog: currentOps,
      ok: 1,
    };
  }

  @returnsPromise
  @apiVersions([])
  async killOp(opId: number | string): Promise<Document> {
    this._emitDatabaseApiCall('killOp', { opId });
    return await this._runAdminCommand({
      killOp: 1,
      op: opId,
    });
  }

  @returnsPromise
  @apiVersions([])
  async shutdownServer(opts: Document = {}): Promise<Document> {
    this._emitDatabaseApiCall('shutdownServer', { opts: opts });
    return await this._runAdminCommand({
      shutdown: 1,
      ...opts,
    });
  }

  @returnsPromise
  @apiVersions([])
  async fsyncLock(): Promise<Document> {
    this._emitDatabaseApiCall('fsyncLock', {});
    return await this._runAdminCommand({
      fsync: 1,
      lock: true,
    });
  }

  @returnsPromise
  @apiVersions([])
  async fsyncUnlock(): Promise<Document> {
    this._emitDatabaseApiCall('fsyncUnlock', {});
    return await this._runAdminCommand({
      fsyncUnlock: 1,
    });
  }

  @returnsPromise
  @apiVersions([])
  async version(): Promise<string> {
    this._emitDatabaseApiCall('version', {});
    const info: Document = await this._runAdminReadCommand({
      buildInfo: 1,
    });
    if (!info || info.version === undefined) {
      throw new MongoshRuntimeError(
        `Error running command serverBuildInfo ${
          info ? info.errmsg || '' : ''
        }`,
        CommonErrors.CommandFailed
      );
    }
    return info.version;
  }

  @returnsPromise
  @apiVersions([])
  async serverBits(): Promise<Document> {
    this._emitDatabaseApiCall('serverBits', {});
    const info: Document = await this._runAdminReadCommand({
      buildInfo: 1,
    });
    if (!info || info.bits === undefined) {
      throw new MongoshRuntimeError(
        `Error running command serverBuildInfo ${
          info ? info.errmsg || '' : ''
        }`,
        CommonErrors.CommandFailed
      );
    }
    return info.bits;
  }

  @returnsPromise
  @apiVersions([])
  async isMaster(): Promise<Document> {
    this._emitDatabaseApiCall('isMaster', {});
    const result = await this._runReadCommand({
      isMaster: 1,
    });
    result.isWritablePrimary = result.ismaster;
    return result;
  }

  @returnsPromise
  @apiVersions([1])
  @serverVersions(['5.0.0', ServerVersions.latest])
  async hello(): Promise<Document> {
    this._emitDatabaseApiCall('hello', {});
    try {
      this._cachedHello = await this._runReadCommand({
        hello: 1,
      });
      return this._cachedHello;
    } catch (err: any) {
      if (err?.codeName === 'CommandNotFound') {
        const result = await this.isMaster();
        delete result.ismaster;
        this._cachedHello = result;
        return this._cachedHello;
      }
      throw err;
    }
  }

  @returnsPromise
  @apiVersions([])
  async serverBuildInfo(): Promise<Document> {
    this._emitDatabaseApiCall('serverBuildInfo', {});
    return await this._runAdminReadCommand({
      buildInfo: 1,
    });
  }

  @returnsPromise
  @apiVersions([])
  async serverStatus(opts = {}): Promise<Document> {
    this._emitDatabaseApiCall('serverStatus', { options: opts });
    return await this._runAdminReadCommand({
      serverStatus: 1,
      ...opts,
    });
  }

  @returnsPromise
  @apiVersions([])
  async stats(scaleOrOptions: number | Document = 1): Promise<Document> {
    assertArgsDefinedType(
      [scaleOrOptions],
      [['number', 'object']],
      'Database.stats'
    );
    if (typeof scaleOrOptions === 'number') {
      scaleOrOptions = { scale: scaleOrOptions };
    }
    this._emitDatabaseApiCall('stats', { scale: scaleOrOptions.scale });
    return await this._runReadCommand({
      dbStats: 1,
      scale: 1,
      ...scaleOrOptions,
    });
  }

  @returnsPromise
  @apiVersions([])
  async hostInfo(): Promise<Document> {
    this._emitDatabaseApiCall('hostInfo', {});
    return await this._runAdminReadCommand({
      hostInfo: 1,
    });
  }

  @returnsPromise
  @apiVersions([])
  async serverCmdLineOpts(): Promise<Document> {
    this._emitDatabaseApiCall('serverCmdLineOpts', {});
    return await this._runAdminReadCommand({
      getCmdLineOpts: 1,
    });
  }

  @returnsPromise
  @serverVersions(['5.0.0', ServerVersions.latest])
  @apiVersions([])
  async rotateCertificates(message?: string): Promise<Document> {
    this._emitDatabaseApiCall('rotateCertificates', { message });
    return await this._runAdminCommand({
      rotateCertificates: 1,
      message,
    });
  }

  @returnsPromise
  @apiVersions([])
  async printCollectionStats(scale = 1): Promise<Document> {
    if (typeof scale !== 'number' || scale < 1) {
      throw new MongoshInvalidInputError(
        `scale has to be a number >=1, got ${scale}`,
        CommonErrors.InvalidArgument
      );
    }
    this._emitDatabaseApiCall('printCollectionStats', { scale: scale });
    const colls: string[] = await this.getCollectionNames();
    const result: Record<string, any> = {};
    for (const c of colls) {
      try {
        result[c] = await this.getCollection(c).stats({ scale });
      } catch (error: any) {
        result[c] = { ok: 0, errmsg: error?.message };
      }
    }
    return new CommandResult('StatsResult', result);
  }

  @returnsPromise
  @apiVersions([])
  async getProfilingStatus(): Promise<Document> {
    this._emitDatabaseApiCall('getProfilingStatus', {});
    return await this._runReadCommand({
      profile: -1,
    });
  }

  @returnsPromise
  @apiVersions([])
  async setProfilingLevel(
    level: number,
    opts: number | Document = {}
  ): Promise<Document> {
    assertArgsDefinedType([level], ['number'], 'Database.setProfilingLevel');
    if (level < 0 || level > 2) {
      throw new MongoshInvalidInputError(
        `Input level ${level} is out of range [0..2]`,
        CommonErrors.InvalidArgument
      );
    }
    if (typeof opts === 'number') {
      opts = { slowms: opts };
    }
    this._emitDatabaseApiCall('setProfilingLevel', { opts: opts });
    return await this._runCommand({
      profile: level,
      ...opts,
    });
  }

  @returnsPromise
  @apiVersions([])
  async setLogLevel(
    logLevel: number,
    component?: Document | string
  ): Promise<Document> {
    assertArgsDefinedType([logLevel], ['number'], 'Database.setLogLevel');
    this._emitDatabaseApiCall('setLogLevel', {
      logLevel: logLevel,
      component: component,
    });
    let componentNames: string[] = [];
    if (typeof component === 'string') {
      componentNames = component.split('.');
    } else if (component !== undefined) {
      throw new MongoshInvalidInputError(
        `setLogLevel component must be a string: got ${typeof component}`,
        CommonErrors.InvalidArgument
      );
    }
    let vDoc: any = { verbosity: logLevel };

    // nest vDoc
    while (componentNames.length > 0) {
      const key = componentNames.pop() as string;
      vDoc = { [key]: vDoc };
    }

    const cmdObj = { setParameter: 1, logComponentVerbosity: vDoc };

    return await this._runAdminCommand(cmdObj);
  }

  @returnsPromise
  @apiVersions([])
  async getLogComponents(): Promise<Document> {
    this._emitDatabaseApiCall('getLogComponents', {});
    const cmdObj = { getParameter: 1, logComponentVerbosity: 1 };

    const result = await this._runAdminReadCommand(cmdObj);
    if (!result || result.logComponentVerbosity === undefined) {
      throw new MongoshRuntimeError(
        `Error running command  ${result ? result.errmsg || '' : ''}`,
        CommonErrors.CommandFailed
      );
    }
    return result.logComponentVerbosity;
  }

  @deprecated
  cloneDatabase(): void {
    throw new MongoshDeprecatedError(
      '`cloneDatabase()` was removed because it was deprecated in MongoDB 4.0'
    );
  }

  @deprecated
  cloneCollection(): void {
    throw new MongoshDeprecatedError(
      '`cloneCollection()` was removed because it was deprecated in MongoDB 4.0'
    );
  }

  @deprecated
  copyDatabase(): void {
    throw new MongoshDeprecatedError(
      '`copyDatabase()` was removed because it was deprecated in MongoDB 4.0'
    );
  }

  @returnsPromise
  @apiVersions([1])
  async commandHelp(name: string): Promise<Document> {
    assertArgsDefinedType([name], ['string'], 'Database.commandHelp');
    this._emitDatabaseApiCall('commandHelp', { name: name });
    const command = {} as any;
    command[name] = 1;
    command.help = true;

    const result = await this._runCommand(command);
    if (!result || result.help === undefined) {
      throw new MongoshRuntimeError(
        `Error running command commandHelp ${
          result ? result.errmsg || '' : ''
        }`,
        CommonErrors.CommandFailed
      );
    }
    return result.help;
  }

  @returnsPromise
  @apiVersions([])
  async listCommands(): Promise<CommandResult> {
    this._emitDatabaseApiCall('listCommands', {});
    const result = await this._runReadCommand({
      listCommands: 1,
    });
    if (!result || result.commands === undefined) {
      throw new MongoshRuntimeError(
        `Error running command listCommands ${
          result ? result.errmsg || '' : ''
        }`,
        CommonErrors.CommandFailed
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    for (const cmdDescription of Object.values(result.commands) as Document[]) {
      if ('slaveOk' in cmdDescription) {
        cmdDescription.secondaryOk = cmdDescription.slaveOk;
        delete cmdDescription.slaveOk;
      }
      if ('slaveOverrideOk' in cmdDescription) {
        cmdDescription.secondaryOverrideOk = cmdDescription.slaveOverrideOk;
        delete cmdDescription.slaveOverrideOk;
      }
    }

    return new CommandResult('ListCommandsResult', result.commands);
  }

  @serverVersions([ServerVersions.earliest, '5.1.0'])
  @deprecated
  @returnsPromise
  @apiVersions([])
  async getLastErrorObj(
    w?: number | string,
    wTimeout?: number,
    j?: boolean
  ): Promise<Document> {
    await this._instanceState.printDeprecationWarning(
      'Database.getLastErrorObj() is deprecated and will be removed in the future.'
    );

    this._emitDatabaseApiCall('getLastErrorObj', {
      w: w,
      wTimeout: wTimeout,
      j: j,
    });
    return await this._getLastErrorObj(w, wTimeout, j);
  }

  @deprecated
  @returnsPromise
  @apiVersions([])
  async getLastError(
    w?: number | string,
    wTimeout?: number
  ): Promise<Document | null> {
    await this._instanceState.printDeprecationWarning(
      'Database.getLastError() is deprecated and will be removed in the future.'
    );

    this._emitDatabaseApiCall('getLastError', { w: w, wTimeout: wTimeout });
    const result = await this._getLastErrorObj(w, wTimeout);
    return result.err || null;
  }

  @returnsPromise
  @topologies(['Sharded'])
  @apiVersions([1])
  async printShardingStatus(verbose = false): Promise<CommandResult> {
    this._emitDatabaseApiCall('printShardingStatus', { verbose });
    const result = await getPrintableShardStatus(
      await getConfigDB(this),
      verbose
    );
    return new CommandResult('StatsResult', result);
  }

  @returnsPromise
  @topologies(['ReplSet'])
  @apiVersions([])
  async printSecondaryReplicationInfo(): Promise<CommandResult> {
    let startOptimeDate = null;
    const local = this.getSiblingDB('local');

    if (
      (await local.getCollection('system.replset').countDocuments({})) !== 0
    ) {
      const status = await this._runAdminReadCommand({ replSetGetStatus: 1 });
      // get primary
      let primary = null;
      for (const member of status.members) {
        if (member.state === 1) {
          primary = member;
          break;
        }
      }
      if (primary) {
        startOptimeDate = primary.optimeDate;
      } else {
        // no primary, find the most recent op among all members
        startOptimeDate = new Date(0, 0);
        for (const member of status.members) {
          if (member.optimeDate > startOptimeDate) {
            startOptimeDate = member.optimeDate;
          }
        }
      }

      const result = {} as any;
      for (const node of status.members) {
        const nodeResult = {} as any;
        if (node === null || node === undefined) {
          throw new MongoshRuntimeError(
            'Member returned from command replSetGetStatus is null',
            CommonErrors.CommandFailed
          );
        }
        if (node.state === 1 || node.state === 7) {
          // ignore primaries (1) and arbiters (7)
          continue;
        }

        if (node.optime && node.health !== 0) {
          // get repl lag
          if (startOptimeDate === null || startOptimeDate === undefined) {
            throw new MongoshRuntimeError(
              'getReplLag startOptimeDate is null',
              CommonErrors.CommandFailed
            );
          }
          if (startOptimeDate) {
            nodeResult.syncedTo = node.optimeDate.toString();
          }
          const ago = (startOptimeDate - node.optimeDate) / 1000;
          const hrs = Math.round(ago / 36) / 100;
          let suffix = '';
          if (primary) {
            suffix = 'primary ';
          } else {
            suffix = 'freshest member (no primary available at the moment)';
          }
          nodeResult.replLag = `${Math.round(
            ago
          )} secs (${hrs} hrs) behind the ${suffix}`;
        } else {
          nodeResult['no replication info, yet.  State'] = node.stateStr;
        }

        result[`source: ${node.name}`] = nodeResult;
      }
      return new CommandResult('StatsResult', result);
    }
    throw new MongoshInvalidInputError(
      'local.system.replset is empty. Are you connected to a replica set?',
      ShellApiErrors.NotConnectedToReplicaSet
    );
  }

  @returnsPromise
  @topologies(['ReplSet'])
  @apiVersions([])
  async getReplicationInfo(): Promise<Document> {
    const localdb = this.getSiblingDB('local');

    const result: Document = {};
    const oplog = 'oplog.rs';
    const localCollections = await localdb.getCollectionNames();
    if (!localCollections.includes(oplog)) {
      throw new MongoshInvalidInputError(
        'Replication not detected. Are you connected to a replset?',
        ShellApiErrors.NotConnectedToReplicaSet
      );
    }

    const ol = localdb.getCollection(oplog);
    const [olStats, first, last] = await Promise.all([
      ol.stats(),
      (async () =>
        (await ol.find()).sort({ $natural: 1 }).limit(1).tryNext())(),
      (async () =>
        (await ol.find()).sort({ $natural: -1 }).limit(1).tryNext())(),
    ]);

    if (!olStats?.maxSize) {
      throw new MongoshRuntimeError(
        `Could not get stats for local.${oplog} collection. collstats returned ${JSON.stringify(
          olStats
        )}`,
        CommonErrors.CommandFailed
      );
    }

    // see MONGOSH-205
    result.configuredLogSizeMB = olStats.maxSize / (1024 * 1024);
    result.logSizeMB = Math.max(olStats.maxSize, olStats.size) / (1024 * 1024);

    result.usedMB = olStats.size / (1024 * 1024);
    result.usedMB = Math.ceil(result.usedMB * 100) / 100;

    if (first === null || last === null) {
      throw new MongoshRuntimeError(
        'objects not found in local.oplog.$main -- is this a new and empty db instance?',
        CommonErrors.CommandFailed
      );
    }

    let tfirst = first.ts;
    let tlast = last.ts;

    if (tfirst && tlast) {
      tfirst = tsToSeconds(tfirst);
      tlast = tsToSeconds(tlast);
      result.timeDiff = tlast - tfirst;
      result.timeDiffHours = Math.round(result.timeDiff / 36) / 100;
      result.tFirst = new Date(tfirst * 1000).toString();
      result.tLast = new Date(tlast * 1000).toString();
      result.now = Date();
    } else {
      result.errmsg = 'ts element not found in oplog objects';
    }
    return result;
  }

  @returnsPromise
  @apiVersions([])
  @topologies(['ReplSet'])
  async printReplicationInfo(): Promise<CommandResult> {
    const result = {} as any;
    let replInfo;
    try {
      replInfo = await this.getReplicationInfo();
    } catch (error: any) {
      const helloResult = await this.hello();
      if (helloResult.arbiterOnly) {
        return new CommandResult('StatsResult', {
          message: 'cannot provide replication status from an arbiter',
        });
      } else if (!helloResult.isWritablePrimary) {
        const secondaryInfo = await this.printSecondaryReplicationInfo();
        return new CommandResult('StatsResult', {
          message: 'this is a secondary, printing secondary replication info.',
          ...(secondaryInfo.value as any),
        });
      }
      throw error;
    }
    result['actual oplog size'] = `${replInfo.logSizeMB} MB`;
    result['configured oplog size'] = `${replInfo.configuredLogSizeMB} MB`;
    result[
      'log length start to end'
    ] = `${replInfo.timeDiff} secs (${replInfo.timeDiffHours} hrs)`;
    result['oplog first event time'] = replInfo.tFirst;
    result['oplog last event time'] = replInfo.tLast;
    result.now = replInfo.now;
    return new CommandResult('StatsResult', result);
  }

  @deprecated
  printSlaveReplicationInfo(): never {
    throw new MongoshDeprecatedError(
      'Method deprecated, use db.printSecondaryReplicationInfo instead'
    );
  }

  @deprecated
  @returnsPromise
  async setSecondaryOk(): Promise<void> {
    await this._mongo.setSecondaryOk();
  }

  @serverVersions(['3.1.0', ServerVersions.latest])
  @topologies(['ReplSet', 'Sharded'])
  @apiVersions([1])
  @returnsPromise
  async watch(
    pipeline: MQLPipeline | ChangeStreamOptions = [],
    options: ChangeStreamOptions = {}
  ): Promise<ChangeStreamCursor> {
    if (!Array.isArray(pipeline)) {
      options = pipeline;
      pipeline = [];
    }
    this._emitDatabaseApiCall('watch', { pipeline, options });
    const cursor = new ChangeStreamCursor(
      this._mongo._serviceProvider.watch(
        pipeline,
        {
          ...(await this._baseOptions()),
          ...options,
        },
        {},
        this._name
      ),
      this._name,
      this._mongo
    );
    if (
      !options.resumeAfter &&
      !options.startAfter &&
      !options.startAtOperationTime
    ) {
      await cursor.tryNext(); // See comment in coll.watch().
    }
    this._mongo._instanceState.currentCursor = cursor;
    return cursor;
  }

  @serverVersions(['4.4.0', ServerVersions.latest])
  @returnsPromise
  @returnType('AggregationCursor')
  async sql(
    sqlString: string,
    options?: AggregateOptions
  ): Promise<AggregationCursor> {
    this._emitDatabaseApiCall('sql', { sqlString: sqlString, options });
    await this._instanceState.shellApi.print(
      'Note: this is an experimental feature that may be subject to change in future releases.'
    );

    const cursor = await this.aggregate(
      [
        {
          $sql: {
            statement: sqlString,
            format: 'jdbc',
            dialect: 'mongosql',
            formatVersion: 1,
          },
        },
      ],
      options
    );

    try {
      await cursor.hasNext();
    } catch (err: any) {
      if (err.code?.valueOf() === 40324) {
        // unrecognized stage error
        throw new MongoshRuntimeError(
          'db.sql currently only works when connected to a Data Lake',
          CommonErrors.CommandFailed
        );
      }

      throw err;
    }

    return cursor;
  }

  @serverVersions(['7.0.0', ServerVersions.latest])
  @topologies(['Sharded'])
  @returnsPromise
  async checkMetadataConsistency(
    options: CheckMetadataConsistencyOptions = {}
  ): Promise<RunCommandCursor> {
    this._emitDatabaseApiCall('checkMetadataConsistency', { options });

    return this._runCursorCommand({
      checkMetadataConsistency: 1,
    });
  }
}
