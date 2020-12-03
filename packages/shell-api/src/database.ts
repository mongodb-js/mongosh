/* eslint-disable complexity */
import {
  CommonErrors,
  MongoshDeprecatedError,
  MongoshInvalidInputError,
  MongoshRuntimeError,
  MongoshUnimplementedError,
  MongoshInternalError
} from '@mongosh/errors';
import { HIDDEN_COMMANDS } from '@mongosh/history';
import {
  Document,
  WriteConcern,
  ChangeStreamOptions
} from '@mongosh/service-provider-core';
import Collection from './collection';
import {
  hasAsyncChild, returnsPromise,
  returnType,


  serverVersions, ShellApiClass, shellApiClassDefault
} from './decorators';
import { ADMIN_DB, asPrintable, ServerVersions } from './enums';
import { ShellApiErrors } from './error-codes';
import {
  adaptAggregateOptions,
  adaptOptions,
  assertArgsDefined, assertArgsType,
  assertKeysDefined, getPrintableShardStatus,
  processDigestPassword, tsToSeconds
} from './helpers';
import { AggregationCursor, CommandResult } from './index';
import Mongo from './mongo';
import Session from './session';
import ChangeStreamCursor from './change-stream-cursor';


@shellApiClassDefault
@hasAsyncChild
export default class Database extends ShellApiClass {
  _mongo: Mongo;
  _name: string;
  _collections: Record<string, Collection>;
  _baseOptions: Record<string, any>;

  constructor(mongo: Mongo, name: string, session?: Session) {
    super();
    this._mongo = mongo;
    this._name = name;
    const collections: Record<string, Collection> = {};
    this._collections = collections;
    this._baseOptions = {};
    if (session !== undefined) {
      this._baseOptions.session = session._session;
    }
    const proxy = new Proxy(this, {
      get: (target, prop): any => {
        if (prop in target) {
          return (target as any)[prop];
        }

        if (
          typeof prop !== 'string' ||
          prop.startsWith('_') ||
          !prop.trim()
        ) {
          return;
        }

        if (!collections[prop]) {
          collections[prop] = new Collection(mongo, proxy, prop);
        }

        return collections[prop];
      }
    });
    return proxy;
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
  private _emitDatabaseApiCall(methodName: string, methodArguments: Document = {}): void {
    this._mongo._internalState.emitApiCall({
      method: methodName,
      class: 'Database',
      db: this._name,
      arguments: methodArguments
    });
  }

  // Private helpers to avoid sending telemetry events for internal calls. Public so rs/sh can use them

  public async _runCommand(cmd: Document, options = {}): Promise<Document> {
    return this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      cmd,
      { ...this._baseOptions, ...options }
    );
  }

  public async _runAdminCommand(cmd: Document, options = {}): Promise<Document> {
    return this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      cmd,
      { ...this._baseOptions, ...options }
    );
  }

  private async _listCollections(filter: Document, options: Document): Promise<Document[]> {
    return await this._mongo._serviceProvider.listCollections(
      this._name,
      filter,
      { ...this._baseOptions, ...options }
    );
  }

  async _getLastErrorObj(w?: number|string, wTimeout?: number, j?: boolean): Promise<Document> {
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
        this._baseOptions
      );
    } catch (e) {
      return e;
    }
  }

  @returnType('Mongo')
  getMongo(): Mongo {
    return this._mongo;
  }

  getName(): string {
    return this._name;
  }

  /**
   * Returns an array of collection names
   *
   * @return {Promise}
   */
  @returnsPromise
  async getCollectionNames(): Promise<string[]> {
    this._emitDatabaseApiCall('getCollectionNames');
    const infos = await this._listCollections({}, { nameOnly: true });
    return infos.map((collection: any) => collection.name);
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
  async getCollectionInfos(filter: Document = {}, options: Document = {}): Promise<Document[]> {
    this._emitDatabaseApiCall('getCollectionInfos', { filter, options });
    return await this._listCollections(
      filter,
      options
    );
  }

  /**
   * Run a command against the db.
   *
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results.
   */
  @returnsPromise
  async runCommand(cmd: Document): Promise<Document> {
    assertArgsDefined(cmd);
    const hiddenCommands = new RegExp(HIDDEN_COMMANDS);
    if (!Object.keys(cmd).some(k => hiddenCommands.test(k))) {
      this._emitDatabaseApiCall('runCommand', { cmd });
    }
    return this._runCommand(cmd);
  }

  /**
   * Run a command against the admin db.
   *
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results.
   */
  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  async adminCommand(cmd: Document): Promise<Document> {
    assertArgsDefined(cmd);
    const hiddenCommands = new RegExp(HIDDEN_COMMANDS);
    if (!Object.keys(cmd).some(k => hiddenCommands.test(k))) {
      this._emitDatabaseApiCall('adminCommand', { cmd });
    }
    return await this._runAdminCommand(cmd, {});
  }

  /**
   * Run an aggregation against the db.
   *
   * @param pipeline
   * @param options
   * @returns {Promise} The promise of aggregation results.
   */
  @returnsPromise
  @returnType('AggregationCursor')
  async aggregate(pipeline: Document[], options?: Document): Promise<AggregationCursor> {
    assertArgsDefined(pipeline);
    this._emitDatabaseApiCall('aggregate', { options, pipeline });

    const {
      aggOptions,
      dbOptions,
      explain
    } = adaptAggregateOptions(options);

    const providerCursor = this._mongo._serviceProvider.aggregateDb(
      this._name,
      pipeline,
      { ...this._baseOptions, ...aggOptions },
      dbOptions
    );
    const cursor = new AggregationCursor(this._mongo, providerCursor);

    if (explain) {
      return await cursor.explain('queryPlanner');
    }

    this._mongo._internalState.currentCursor = cursor;
    return cursor;
  }

  @returnType('Database')
  getSiblingDB(db: string): Database {
    assertArgsDefined(db);
    this._emitDatabaseApiCall('getSiblingDB', { db });
    if (this._baseOptions.session) {
      return this._baseOptions.session.getDatabase(db);
    }
    return this._mongo._getDb(db);
  }

  @returnType('Collection')
  getCollection(coll: string): Collection {
    assertArgsDefined(coll);
    assertArgsType([coll], ['string']);
    this._emitDatabaseApiCall('getCollection', { coll });
    if (!coll.trim()) {
      throw new MongoshInvalidInputError('Collection name cannot be empty.', CommonErrors.InvalidArgument);
    }

    const collections: Record<string, Collection> = this._collections;

    if (!collections[coll]) {
      collections[coll] = new Collection(this._mongo, this, coll);
    }

    return collections[coll];
  }

  @returnsPromise
  async dropDatabase(writeConcern?: WriteConcern): Promise<Document> {
    return await this._mongo._serviceProvider.dropDatabase(
      this._name,
      { ...this._baseOptions, writeConcern }
    );
  }

  @returnsPromise
  async createUser(user: Document, writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(user);
    assertKeysDefined(user, ['user', 'roles', 'pwd']);
    this._emitDatabaseApiCall('createUser', {});
    if (user.createUser) {
      throw new MongoshInvalidInputError('Cannot set createUser field in helper method', CommonErrors.InvalidArgument);
    }
    const command = adaptOptions(
      { user: 'createUser', passwordDigestor: null },
      {},
      user
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const digestPwd = processDigestPassword(user.user, user.passwordDigestor, command);
    const orderedCmd = { createUser: command.createUser, ...command, ...digestPwd };
    return await this._runCommand(
      orderedCmd
    );
  }

  @returnsPromise
  async updateUser(username: string, userDoc: Document, writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(username, userDoc);
    this._emitDatabaseApiCall('updateUser', {});
    if (userDoc.passwordDigestor && userDoc.passwordDigestor !== 'server' && userDoc.passwordDigestor !== 'client') {
      throw new MongoshInvalidInputError(
        `Invalid field: passwordDigestor must be 'client' or 'server', got ${userDoc.passwordDigestor}`,
        CommonErrors.InvalidArgument
      );
    }

    const command = adaptOptions(
      { passwordDigestor: null },
      {
        updateUser: username
      },
      userDoc
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const digestPwd = processDigestPassword(username, userDoc.passwordDigestor, command);
    const orderedCmd = { updateUser: command.updateUser, ...command, ...digestPwd };
    return await this._runCommand(
      orderedCmd
    );
  }

  @returnsPromise
  async changeUserPassword(username: string, password: string, writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(username, password);
    this._emitDatabaseApiCall('changeUserPassword', {});
    const command = adaptOptions(
      {},
      {
        updateUser: username,
        pwd: password
      },
      {}
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }

    const orderedCmd = { updateUser: command.updateUser, ...command };
    return await this._runCommand(
      orderedCmd
    );
  }

  @returnsPromise
  async logout(): Promise<Document> {
    this._emitDatabaseApiCall('logout', {});
    return await this._runCommand({ logout: 1 });
  }

  @returnsPromise
  async dropUser(username: string, writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(username);
    this._emitDatabaseApiCall('dropUser', {});
    const cmd = { dropUser: username } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async dropAllUsers(writeConcern?: WriteConcern): Promise<Document> {
    this._emitDatabaseApiCall('dropAllUsers', {});
    const cmd = { dropAllUsersFromDatabase: 1 } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async auth(...args: [{user: string, pwd: string, authDb?: string, mechanism?: string}] | [string, string]): Promise<{ ok: number }> {
    this._emitDatabaseApiCall('auth', {});
    let authDoc;
    if (args.length === 1) {
      authDoc = args[0];
    } else if (args.length === 2) {
      authDoc = {
        user: args[0],
        pwd: args[1]
      };
    } else {
      throw new MongoshInvalidInputError(
        'auth expects (username), (username, password), or ({ user: username, pwd: password })',
        CommonErrors.InvalidArgument
      );
    }
    if (!authDoc.user || !authDoc.pwd) {
      throw new MongoshInvalidInputError(
        'auth expects user document with \'user\' and \'pwd\' fields',
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
    return await this._mongo._serviceProvider.authenticate(authDoc);
  }

  @returnsPromise
  async grantRolesToUser(username: string, roles: any[], writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(username, roles);
    this._emitDatabaseApiCall('grantRolesToUser', {});
    const cmd = { grantRolesToUser: username, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async revokeRolesFromUser(username: string, roles: any[], writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(username, roles);
    this._emitDatabaseApiCall('revokeRolesFromUser', {});
    const cmd = { revokeRolesFromUser: username, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async getUser(username: string, options: Document = {}): Promise<Document | null> {
    assertArgsDefined(username);
    this._emitDatabaseApiCall('getUser', { username: username });
    const command = adaptOptions(
      { },
      { usersInfo: { user: username, db: this._name } },
      options
    );
    const result = await this._runCommand(command);
    if (result.users === undefined) {
      throw new MongoshInternalError('No users were returned from the userInfo command');
    }
    for (let i = 0; i < result.users.length; i++) {
      if (result.users[i].user === username) {
        return result.users[i];
      }
    }
    return null;
  }

  @returnsPromise
  async getUsers(options: Document = {}): Promise<Document> {
    this._emitDatabaseApiCall('getUsers', { options: options });
    const command = adaptOptions(
      { },
      { usersInfo: 1 },
      options
    );
    return await this._runCommand(
      command
    );
  }

  @returnsPromise
  async createCollection(name: string, options: Document = {}): Promise<{ ok: number }> {
    assertArgsDefined(name);
    this._emitDatabaseApiCall('createCollection', { name: name, options: options });
    return await this._mongo._serviceProvider.createCollection(
      this._name,
      name,
      { ...this._baseOptions, ...options }
    );
  }

  @returnsPromise
  async createView(name: string, source: string, pipeline: Document[], options: Document = {}): Promise<{ ok: number }> {
    assertArgsDefined(name, source, pipeline);
    this._emitDatabaseApiCall('createView', { name, source, pipeline, options });
    const ccOpts = {
      ...this._baseOptions,
      viewOn: source,
      pipeline: pipeline
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
  async createRole(role: Document, writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(role);
    assertKeysDefined(role, ['role', 'privileges', 'roles']);
    this._emitDatabaseApiCall('createRole', {});
    if (role.createRole) {
      throw new MongoshInvalidInputError(
        'Cannot set createRole field in helper method',
        CommonErrors.InvalidArgument
      );
    }
    const command = adaptOptions(
      { role: 'createRole' },
      {},
      role
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const orderedCmd = { createRole: command.createRole, ...command };
    return await this._runCommand(
      orderedCmd
    );
  }

  @returnsPromise
  async updateRole(rolename: string, roleDoc: Document, writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(rolename, roleDoc);
    this._emitDatabaseApiCall('updateRole', {});
    const command = adaptOptions(
      {},
      {
        updateRole: rolename
      },
      roleDoc
    );
    if (writeConcern) {
      command.writeConcern = writeConcern;
    }
    const orderedCmd = { updateRole: command.updateRole, ...command };
    return await this._runCommand(
      orderedCmd
    );
  }

  @returnsPromise
  async dropRole(rolename: string, writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(rolename);
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
  async grantRolesToRole(rolename: string, roles: any[], writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(rolename, roles);
    this._emitDatabaseApiCall('grantRolesToRole', {});
    const cmd = { grantRolesToRole: rolename, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async revokeRolesFromRole(rolename: string, roles: any[], writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(rolename, roles);
    this._emitDatabaseApiCall('revokeRolesFromRole', {});
    const cmd = { revokeRolesFromRole: rolename, roles: roles } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async grantPrivilegesToRole(rolename: string, privileges: any[], writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(rolename, privileges);
    this._emitDatabaseApiCall('grantPrivilegesToRole', {});
    const cmd = { grantPrivilegesToRole: rolename, privileges: privileges } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }

  @returnsPromise
  async revokePrivilegesFromRole(rolename: string, privileges: any[], writeConcern?: WriteConcern): Promise<Document> {
    assertArgsDefined(rolename, privileges);
    this._emitDatabaseApiCall('revokePrivilegesFromRole', {});
    const cmd = { revokePrivilegesFromRole: rolename, privileges: privileges } as Document;
    if (writeConcern) {
      cmd.writeConcern = writeConcern;
    }
    return await this._runCommand(cmd);
  }


  @returnsPromise
  async getRole(rolename: string, options: Document = {}): Promise<Document | null> {
    assertArgsDefined(rolename);
    this._emitDatabaseApiCall('getRole', { rolename: rolename });
    const command = adaptOptions(
      { },
      { rolesInfo: { role: rolename, db: this._name } },
      options
    );
    const result = await this._runCommand(
      command
    );
    if (result.roles === undefined) {
      throw new MongoshInternalError('No roles returned from rolesInfo command');
    }
    for (let i = 0; i < result.roles.length; i++) {
      if (result.roles[i].role === rolename) {
        return result.roles[i];
      }
    }
    return null;
  }

  @returnsPromise
  async getRoles(options: Document = {}): Promise<Document> {
    this._emitDatabaseApiCall('getRoles', { options: options });
    const command = adaptOptions(
      { },
      { rolesInfo: 1 },
      options
    );
    return await this._runCommand(
      command
    );
  }

  @returnsPromise
  async currentOp(opts: Document = {}): Promise<Document> {
    this._emitDatabaseApiCall('currentOp', { opts: opts });
    return await this._runAdminCommand(
      {
        currentOp: 1,
        ...opts
      }
    );
  }

  @returnsPromise
  async killOp(opId: number): Promise<Document> {
    assertArgsDefined(opId);
    this._emitDatabaseApiCall('killOp', { opId });
    return await this._runAdminCommand(
      {
        killOp: 1,
        op: opId
      }
    );
  }

  @returnsPromise
  async shutdownServer(opts: Document = {}): Promise<Document> {
    this._emitDatabaseApiCall('shutdownServer', { opts: opts });
    return await this._runAdminCommand(
      {
        shutdown: 1,
        ...opts
      }
    );
  }

  @returnsPromise
  async fsyncLock(): Promise<Document> {
    this._emitDatabaseApiCall('fsyncLock', {});
    return await this._runAdminCommand(
      {
        fsync: 1,
        lock: true
      }
    );
  }

  @returnsPromise
  async fsyncUnlock(): Promise<Document> {
    this._emitDatabaseApiCall('fsyncUnlock', {});
    return await this._runAdminCommand(
      {
        fsyncUnlock: 1
      }
    );
  }

  @returnsPromise
  async version(): Promise<Document> {
    this._emitDatabaseApiCall('version', {});
    const info: Document = await this._runAdminCommand(
      {
        buildInfo: 1,
      }
    );
    if (!info || info.version === undefined) {
      throw new MongoshRuntimeError(
        `Error running command serverBuildInfo ${info ? info.errmsg || '' : ''}`,
        CommonErrors.CommandFailed
      );
    }
    return info.version;
  }

  @returnsPromise
  async serverBits(): Promise<Document> {
    this._emitDatabaseApiCall('serverBits', {});
    const info: Document = await this._runAdminCommand(
      {
        buildInfo: 1,
      }
    );
    if (!info || info.bits === undefined) {
      throw new MongoshRuntimeError(
        `Error running command serverBuildInfo ${info ? info.errmsg || '' : ''}`,
        CommonErrors.CommandFailed
      );
    }
    return info.bits;
  }

  @returnsPromise
  async isMaster(): Promise<Document> {
    this._emitDatabaseApiCall('isMaster', {});
    return await this._runCommand(
      {
        isMaster: 1,
      }
    );
  }

  @returnsPromise
  async serverBuildInfo(): Promise<Document> {
    this._emitDatabaseApiCall('serverBuildInfo', {});
    return await this._runAdminCommand(
      {
        buildInfo: 1,
      }
    );
  }

  @returnsPromise
  async serverStatus(opts = {}): Promise<Document> {
    this._emitDatabaseApiCall('serverStatus', { options: opts });
    return await this._runAdminCommand(
      {
        serverStatus: 1, ...opts
      }
    );
  }

  @returnsPromise
  async stats(scale = 1): Promise<Document> {
    this._emitDatabaseApiCall('stats', { scale: scale });
    return await this._runAdminCommand(
      {
        dbStats: 1,
        scale: scale
      }
    );
  }

  @returnsPromise
  async hostInfo(): Promise<Document> {
    this._emitDatabaseApiCall('hostInfo', {});
    return await this._runAdminCommand(
      {
        hostInfo: 1,
      }
    );
  }

  @returnsPromise
  async serverCmdLineOpts(): Promise<Document> {
    this._emitDatabaseApiCall('serverCmdLineOpts', {});
    return await this._runAdminCommand(
      {
        getCmdLineOpts: 1,
      }
    );
  }

  @returnsPromise
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
      } catch (error) {
        result[c] = { ok: 0, errmsg: error.message };
      }
    }
    return new CommandResult('StatsResult', result);
  }

  @returnsPromise
  async getFreeMonitoringStatus(): Promise<Document> {
    this._emitDatabaseApiCall('getFreeMonitoringStatus', {});
    return await this._runAdminCommand(
      {
        getFreeMonitoringStatus: 1,
      }
    );
  }

  @returnsPromise
  async disableFreeMonitoring(): Promise<Document> {
    this._emitDatabaseApiCall('disableFreeMonitoring', {});
    return await this._runAdminCommand(
      {
        setFreeMonitoring: 1,
        action: 'disable'
      }
    );
  }

  @returnsPromise
  async enableFreeMonitoring(): Promise<Document | string> {
    this._emitDatabaseApiCall('enableFreeMonitoring', {});
    const isMaster = await this._mongo._serviceProvider.runCommand(this._name, { isMaster: 1 }, this._baseOptions);
    if (!isMaster.ismaster) {
      throw new MongoshInvalidInputError(
        'db.enableFreeMonitoring() may only be run on a primary',
        CommonErrors.InvalidOperation
      );
    }

    // driver should check that ok: 1
    await this._mongo._serviceProvider.runCommand(
      ADMIN_DB,
      {
        setFreeMonitoring: 1,
        action: 'enable'
      },
      this._baseOptions
    );
    let result: any;
    let error: any;
    try {
      result = await this._mongo._serviceProvider.runCommand(
        ADMIN_DB,
        { getFreeMonitoringStatus: 1 },
        this._baseOptions
      );
    } catch (err) {
      error = err;
    }
    if (error && error.codeName === 'Unauthorized' || (result && !result.ok && result.codeName === 'Unauthorized')) {
      return 'Unable to determine status as you lack the \'checkFreeMonitoringStatus\' privilege.';
    } else if (error || !result || !result.ok) {
      throw new MongoshRuntimeError(
        `Error running command setFreeMonitoring ${result ? result.errmsg : error.errmsg}`,
        CommonErrors.CommandFailed
      );
    }
    if (result.state !== 'enabled') {
      const urlResult = await this._mongo._serviceProvider.runCommand(
        ADMIN_DB,
        {
          getParameter: 1,
          cloudFreeMonitoringEndpointURL: 1
        },
        this._baseOptions
      );
      return `Unable to get immediate response from the Cloud Monitoring service. Please check your firewall settings to ensure that mongod can communicate with '${urlResult.cloudFreeMonitoringEndpointURL || '<unknown>'}'`;
    }
    return result;
  }

  @returnsPromise
  async getProfilingStatus(): Promise<Document> {
    this._emitDatabaseApiCall('getProfilingStatus', {});
    return await this._runCommand(
      {
        profile: -1,
      }
    );
  }

  @returnsPromise
  async setProfilingLevel(level: number, opts: number | Document = {}): Promise<Document> {
    assertArgsDefined(level);
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
    return await this._runCommand(
      {
        profile: level,
        ...opts
      }
    );
  }

  @returnsPromise
  async setLogLevel(logLevel: number, component?: Document | string): Promise<Document> {
    assertArgsDefined(logLevel);
    this._emitDatabaseApiCall('setLogLevel', { logLevel: logLevel, component: component });
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

    return await this._runAdminCommand(
      cmdObj
    );
  }

  @returnsPromise
  async getLogComponents(): Promise<Document> {
    this._emitDatabaseApiCall('getLogComponents', {});
    const cmdObj = { getParameter: 1, logComponentVerbosity: 1 };

    const result = await this._runAdminCommand(
      cmdObj
    );
    if (!result || result.logComponentVerbosity === undefined) {
      throw new MongoshRuntimeError(
        `Error running command  ${result ? result.errmsg || '' : ''}`,
        CommonErrors.CommandFailed
      );
    }
    return result.logComponentVerbosity;
  }

  cloneDatabase(): void {
    throw new MongoshDeprecatedError('`cloneDatabase()` was removed because it was deprecated in MongoDB 4.0');
  }

  cloneCollection(): void {
    throw new MongoshDeprecatedError('`cloneCollection()` was removed because it was deprecated in MongoDB 4.0');
  }

  copyDatabase(): void {
    throw new MongoshDeprecatedError('`copyDatabase()` was removed because it was deprecated in MongoDB 4.0');
  }

  async commandHelp(name: string): Promise<Document> {
    assertArgsDefined(name);
    this._emitDatabaseApiCall('commandHelp', { name: name });
    const command = {} as any;
    command[name] = 1;
    command.help = true;

    const result = await this._runCommand(
      command
    );
    if (!result || result.help === undefined) {
      throw new MongoshRuntimeError(
        `Error running command commandHelp ${result ? result.errmsg || '' : ''}`,
        CommonErrors.CommandFailed
      );
    }
    return result.help;
  }

  @returnsPromise
  async listCommands(): Promise<CommandResult> {
    this._emitDatabaseApiCall('listCommands', {});
    const result = await this._runCommand(
      {
        listCommands: 1,
      }
    );
    if (!result || result.commands === undefined) {
      throw new MongoshRuntimeError(
        `Error running command listCommands ${result ? result.errmsg || '' : ''}`,
        CommonErrors.CommandFailed
      );
    }
    return new CommandResult('ListCommandsResult', result.commands);
  }

  @returnsPromise
  async getLastErrorObj(w?: number|string, wTimeout?: number, j?: boolean): Promise<Document> {
    this._emitDatabaseApiCall('getLastErrorObj', { w: w, wTimeout: wTimeout, j: j });
    return await this._getLastErrorObj(w, wTimeout, j);
  }

  @returnsPromise
  async getLastError(w?: number|string, wTimeout?: number): Promise<Document | null> {
    this._emitDatabaseApiCall('getLastError', { w: w, wTimeout: wTimeout });
    const result = await this._getLastErrorObj(w, wTimeout);
    return result.err || null;
  }

  @returnsPromise
  async printShardingStatus(verbose = false): Promise<CommandResult> {
    this._emitDatabaseApiCall('printShardingStatus', { verbose });
    const result = await getPrintableShardStatus(this, verbose);
    return new CommandResult('StatsResult', result);
  }

  @returnsPromise
  async printSecondaryReplicationInfo(): Promise<CommandResult> {
    let startOptimeDate = null;
    const local = this.getSiblingDB('local');
    const admin = this.getSiblingDB(ADMIN_DB);

    if (await local.getCollection('system.replset').countDocuments({}) !== 0) {
      const status = await admin.runCommand({ 'replSetGetStatus': 1 });
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
      } else { // no primary, find the most recent op among all members
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
          throw new MongoshRuntimeError('Member returned from command replSetGetStatus is null', CommonErrors.CommandFailed);
        }
        if (node.state === 1 || node.state === 7) { // ignore primaries (1) and arbiters (7)
          continue;
        }

        if (node.optime && node.health !== 0) {
          // get repl lag
          if (startOptimeDate === null || startOptimeDate === undefined) {
            throw new MongoshRuntimeError('getReplLag startOptimeDate is null', CommonErrors.CommandFailed);
          }
          if (startOptimeDate) {
            nodeResult.syncedTo = node.optimeDate.toString();
          }
          const ago = (node.optimeDate - startOptimeDate) / 1000;
          const hrs = Math.round(ago / 36) / 100;
          let suffix = '';
          if (primary) {
            suffix = 'primary ';
          } else {
            suffix = 'freshest member (no primary available at the moment)';
          }
          nodeResult.replLag = `${Math.round(ago)} secs (${hrs} hrs) behind the ${suffix}`;
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
  async getReplicationInfo(): Promise<Document> {
    const localdb = this.getSiblingDB('local');

    const result = {} as Document;
    let oplog;
    const localCollections = await localdb.getCollectionNames();
    if (localCollections.indexOf('oplog.rs') >= 0) {
      oplog = 'oplog.rs';
    } else {
      throw new MongoshInvalidInputError(
        'Replication not detected. Are you connected to a replset?',
        ShellApiErrors.NotConnectedToReplicaSet
      );
    }

    const ol = localdb.getCollection(oplog);
    const olStats = await ol.stats();
    if (olStats && olStats.maxSize) {
      // see MONGOSH-205
      result.logSizeMB = Math.max(olStats.maxSize / (1024 * 1024), olStats.size);
    } else {
      throw new MongoshRuntimeError(
        `Could not get stats for local. ${oplog} collection. collstats returned ${JSON.stringify(olStats)}`,
        CommonErrors.CommandFailed
      );
    }

    result.usedMB = olStats.size / (1024 * 1024);
    result.usedMB = Math.ceil(result.usedMB * 100) / 100;

    const first = await ol.find().sort({ $natural: 1 }).limit(1).tryNext();
    const last = await ol.find().sort({ $natural: -1 }).limit(1).tryNext();
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
      result.tFirst = (new Date(tfirst * 1000)).toString();
      result.tLast = (new Date(tlast * 1000)).toString();
      result.now = Date();
    } else {
      result.errmsg = 'ts element not found in oplog objects';
    }
    return result;
  }

  @returnsPromise
  async printReplicationInfo(): Promise<CommandResult> {
    const result = {} as any;
    let replInfo;
    try {
      replInfo = await this.getReplicationInfo();
    } catch (error) {
      const isMaster = await this._runCommand({ isMaster: 1 });
      if (isMaster.arbiterOnly) {
        return new CommandResult('StatsResult', { message: 'cannot provide replication status from an arbiter' });
      } else if (!isMaster.ismaster) {
        const secondaryInfo = await this.printSecondaryReplicationInfo();
        return new CommandResult('StatsResult', {
          message: 'this is a secondary, printing secondary replication info.',
          ...secondaryInfo.value as any
        });
      }
      throw error;
    }
    result['configured oplog size'] = `${replInfo.logSizeMB} MB`;
    result['log length start to end'] = `${replInfo.timeDiff} secs (${replInfo.timeDiffHours} hrs)`;
    result['oplog first event time'] = replInfo.tFirst;
    result['oplog last event time'] = replInfo.tLast;
    result.now = replInfo.now;
    return new CommandResult('StatResult', result);
  }

  @returnsPromise
  async printSlaveReplicationInfo(): Promise<CommandResult> {
    throw new MongoshDeprecatedError('Method deprecated, use db.printSecondaryReplicationInfo instead');
  }

  @serverVersions(['3.1.0', ServerVersions.latest])
  watch(pipeline: Document[] = [], options: ChangeStreamOptions = {}): ChangeStreamCursor {
    this._emitDatabaseApiCall('watch', { pipeline, options });
    const cursor = new ChangeStreamCursor(
      this._mongo._serviceProvider.watch(pipeline, options, {}, this._name),
      this._name,
      this._mongo
    );
    this._mongo._internalState.currentCursor = cursor;
    return cursor;
  }
}
