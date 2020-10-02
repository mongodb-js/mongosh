/* eslint-disable complexity */
import Mongo from './mongo';
import Collection from './collection';
import {
  shellApiClassDefault,
  returnsPromise,
  returnType,
  hasAsyncChild,
  ShellApiClass,
  serverVersions
} from './decorators';
import { ServerVersions, ADMIN_DB } from './enums';
import {
  adaptAggregateOptions,
  adaptOptions,
  assertArgsDefined,
  assertKeysDefined, getPrintableShardStatus,
  processDigestPassword
} from './helpers';

import {
  Cursor as ServiceProviderCursor,
  Document,
  WriteConcern
} from '@mongosh/service-provider-core';
import { AggregationCursor, CommandResult } from './index';
import { MongoshInvalidInputError, MongoshRuntimeError, MongoshUnimplementedError } from '@mongosh/errors';
import { HIDDEN_COMMANDS } from '@mongosh/history';

@shellApiClassDefault
@hasAsyncChild
export default class Database extends ShellApiClass {
  _mongo: Mongo;
  _name: string;
  _collections: any;

  constructor(mongo, name) {
    super();
    this._mongo = mongo;
    this._name = name;
    const collections = {};
    this._collections = collections;
    const proxy = new Proxy(this, {
      get: (target, prop): any => {
        if (prop in target) {
          return target[prop];
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
  _asPrintable(): string {
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
  async getCollectionNames(): Promise<any> {
    this._emitDatabaseApiCall('getCollectionNames');
    const infos = await this.getCollectionInfos({}, { nameOnly: true });
    return infos.map(collection => collection.name);
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
  async getCollectionInfos(filter: Document = {}, options: Document = {}): Promise<any> {
    this._emitDatabaseApiCall('getCollectionInfos', { filter, options });
    return await this._mongo._serviceProvider.listCollections(
      this._name,
      filter,
      options
    );
  }

  /**
   * Run a command against the db.
   *
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  @returnsPromise
  async runCommand(cmd: any): Promise<any> {
    assertArgsDefined(cmd);
    const hiddenCommands = new RegExp(HIDDEN_COMMANDS);
    if (!Object.keys(cmd).some(k => hiddenCommands.test(k))) {
      this._emitDatabaseApiCall('runCommand', { cmd });
    }
    return this._mongo._serviceProvider.runCommand(this._name, cmd);
  }

  /**
   * Run a command against the admin db.
   *
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  @returnsPromise
  @serverVersions(['3.4.0', ServerVersions.latest])
  adminCommand(cmd: any): Promise<any> {
    assertArgsDefined(cmd);
    const hiddenCommands = new RegExp(HIDDEN_COMMANDS);
    if (!Object.keys(cmd).some(k => hiddenCommands.test(k))) {
      this._emitDatabaseApiCall('adminCommand', { cmd });
    }
    return this._mongo._serviceProvider.runCommand(ADMIN_DB, cmd);
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
      providerOptions,
      dbOptions,
      explain
    } = adaptAggregateOptions(options);

    const providerCursor = this._mongo._serviceProvider.aggregateDb(
      this._name,
      pipeline,
      providerOptions,
      dbOptions
    ) as ServiceProviderCursor;
    const cursor = new AggregationCursor(this._mongo, providerCursor);

    if (explain) {
      return await cursor.explain('queryPlanner'); // TODO: set default or use optional argument
    }

    this._mongo._internalState.currentCursor = cursor;
    return cursor;
  }

  @returnType('Database')
  getSiblingDB(db: string): Database {
    assertArgsDefined(db);
    this._emitDatabaseApiCall('getSiblingDB', { db });
    return this._mongo._getDb(db);
  }

  @returnType('Collection')
  getCollection(coll: string): Collection {
    assertArgsDefined(coll);
    this._emitDatabaseApiCall('getCollection', { coll });
    if (typeof coll !== 'string') {
      throw new MongoshInvalidInputError(
        `Collection name must be a string. Received ${typeof coll}.`);
    }

    if (!coll.trim()) {
      throw new MongoshInvalidInputError('Collection name cannot be empty.');
    }

    const collections: Record<string, Collection> = this._collections;

    if (!collections[coll]) {
      collections[coll] = new Collection(this._mongo, this, coll);
    }

    return collections[coll];
  }

  @returnsPromise
  async dropDatabase(writeConcern?: WriteConcern): Promise<any> {
    return await this._mongo._serviceProvider.dropDatabase(
      this._name,
      writeConcern
    );
  }

  @returnsPromise
  async createUser(user: Document, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(user);
    assertKeysDefined(user, ['user', 'roles', 'pwd']);
    this._emitDatabaseApiCall('createUser', {});
    if (user.createUser) {
      throw new MongoshInvalidInputError('Cannot set createUser field in helper method');
    }
    const command = adaptOptions(
      { user: 'createUser', passwordDigestor: null },
      {
        writeConcern: writeConcern
      },
      user
    );
    const digestPwd = processDigestPassword(user.user, user.passwordDigestor, command);
    const orderedCmd = { createUser: command.createUser, ...command, ...digestPwd };
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      orderedCmd
    );
  }

  @returnsPromise
  async updateUser(username: string, userDoc: Document, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(username, userDoc);
    this._emitDatabaseApiCall('updateUser', {});
    if (userDoc.passwordDigestor && userDoc.passwordDigestor !== 'server' && userDoc.passwordDigestor !== 'client') {
      throw new MongoshInvalidInputError(`Invalid field: passwordDigestor must be 'client' or 'server', got ${userDoc.passwordDigestor}`);
    }

    const command = adaptOptions(
      { passwordDigestor: null },
      {
        updateUser: username,
        writeConcern: writeConcern
      },
      userDoc
    );
    const digestPwd = processDigestPassword(username, userDoc.passwordDigestor, command);
    const orderedCmd = { updateUser: command.updateUser, ...command, ...digestPwd };
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      orderedCmd
    );
  }

  @returnsPromise
  async changeUserPassword(username: string, password: string, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(username, password);
    this._emitDatabaseApiCall('changeUserPassword', {});
    const command = adaptOptions(
      {},
      {
        updateUser: username,
        pwd: password,
        writeConcern: writeConcern
      },
      {}
    );
    const orderedCmd = { updateUser: command.updateUser, ...command };
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      orderedCmd
    );
  }

  @returnsPromise
  async logout(): Promise<any> {
    this._emitDatabaseApiCall('logout', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(this._name, { logout: 1 });
  }

  @returnsPromise
  async dropUser(username: string, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(username);
    this._emitDatabaseApiCall('dropUser', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { dropUser: username, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async dropAllUsers(writeConcern: WriteConcern = {}): Promise<any> {
    this._emitDatabaseApiCall('dropAllUsers', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { dropAllUsersFromDatabase: 1, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async auth(...args): Promise<any> {
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
      throw new MongoshInvalidInputError('auth expects (username), (username, password), or ({ user: username, pwd: password })');
    }
    if (!authDoc.user || !authDoc.pwd) {
      throw new MongoshInvalidInputError('auth expects user document with \'user\' and \'pwd\' fields');
    }
    if ('digestPassword' in authDoc) {
      throw new MongoshUnimplementedError('digestPassword is not supported for authentication.');
    }
    authDoc.authDb = this._name;
    return await this._mongo._serviceProvider.authenticate(authDoc);
  }

  @returnsPromise
  async grantRolesToUser(username: string, roles: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(username, roles);
    this._emitDatabaseApiCall('grantRolesToUser', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { grantRolesToUser: username, writeConcern: writeConcern, roles: roles }
    );
  }

  @returnsPromise
  async revokeRolesFromUser(username: string, roles: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(username, roles);
    this._emitDatabaseApiCall('revokeRolesFromUser', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { revokeRolesFromUser: username, writeConcern: writeConcern, roles: roles }
    );
  }

  @returnsPromise
  async getUser(username: string, options: Document = {}): Promise<any> {
    assertArgsDefined(username);
    this._emitDatabaseApiCall('getUser', { username: username });
    const command = adaptOptions(
      { },
      { usersInfo: { user: username, db: this._name } },
      options
    );
    const result = await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      command
    );
    for (let i = 0; i < result.users.length; i++) {
      if (result.users[i].user === username) {
        return result.users[i];
      }
    }
    return null;
  }

  @returnsPromise
  async getUsers(options: any = {}): Promise<any> {
    this._emitDatabaseApiCall('getUsers', { options: options });
    const command = adaptOptions(
      { },
      { usersInfo: 1 },
      options
    );
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      command
    );
  }

  @returnsPromise
  async createCollection(name: string, options: any = {}): Promise<any> {
    assertArgsDefined(name);
    this._emitDatabaseApiCall('createCollection', { name: name, options: options });
    return await this._mongo._serviceProvider.createCollection(
      this._name,
      name,
      options
    );
  }

  @returnsPromise
  async createView(name: string, source: string, pipeline: any, options: any = {}): Promise<any> {
    assertArgsDefined(name, source, pipeline);
    this._emitDatabaseApiCall('createView', { name, source, pipeline, options });
    const ccOpts = {
      viewOn: source,
      pipeline: pipeline,
    } as any;
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
  async createRole(role: Document, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(role);
    assertKeysDefined(role, ['role', 'privileges', 'roles']);
    this._emitDatabaseApiCall('createRole', {});
    if (role.createRole) {
      throw new MongoshInvalidInputError('Cannot set createRole field in helper method');
    }
    const command = adaptOptions(
      { role: 'createRole' },
      {
        writeConcern: writeConcern
      },
      role
    );
    const orderedCmd = { createRole: command.createRole, ...command };
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      orderedCmd
    );
  }

  @returnsPromise
  async updateRole(rolename: string, roleDoc: Document, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, roleDoc);
    this._emitDatabaseApiCall('updateRole', {});
    const command = adaptOptions(
      {},
      {
        updateRole: rolename,
        writeConcern: writeConcern
      },
      roleDoc
    );
    const orderedCmd = { updateRole: command.updateRole, ...command };
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      orderedCmd
    );
  }

  @returnsPromise
  async dropRole(rolename: string, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename);
    this._emitDatabaseApiCall('dropRole', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { dropRole: rolename, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async dropAllRoles(writeConcern: WriteConcern = {}): Promise<any> {
    this._emitDatabaseApiCall('dropAllRoles', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { dropAllRolesFromDatabase: 1, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async grantRolesToRole(rolename: string, roles: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, roles);
    this._emitDatabaseApiCall('grantRolesToRole', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { grantRolesToRole: rolename, roles: roles, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async revokeRolesFromRole(rolename: string, roles: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, roles);
    this._emitDatabaseApiCall('revokeRolesFromRole', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { revokeRolesFromRole: rolename, roles: roles, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async grantPrivilegesToRole(rolename: string, privileges: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, privileges);
    this._emitDatabaseApiCall('grantPrivilegesToRole', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { grantPrivilegesToRole: rolename, privileges: privileges, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async revokePrivilegesFromRole(rolename: string, privileges: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, privileges);
    this._emitDatabaseApiCall('revokePrivilegesFromRole', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      { revokePrivilegesFromRole: rolename, privileges: privileges, writeConcern: writeConcern }
    );
  }


  @returnsPromise
  async getRole(rolename: string, options: Document = {}): Promise<any> {
    assertArgsDefined(rolename);
    this._emitDatabaseApiCall('getRole', { rolename: rolename });
    const command = adaptOptions(
      { },
      { rolesInfo: { role: rolename, db: this._name } },
      options
    );
    const result = await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      command
    );
    for (let i = 0; i < result.roles.length; i++) {
      if (result.roles[i].role === rolename) {
        return result.roles[i];
      }
    }
    return null;
  }

  @returnsPromise
  async getRoles(options: any = {}): Promise<any> {
    this._emitDatabaseApiCall('getRoles', { options: options });
    const command = adaptOptions(
      { },
      { rolesInfo: 1 },
      options
    );
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      command
    );
  }

  @returnsPromise
  async currentOp(opts: any = {}): Promise<any> {
    this._emitDatabaseApiCall('currentOp', { opts: opts });
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        currentOp: 1,
        ...opts
      }
    );
  }

  @returnsPromise
  async killOp(opId: number): Promise<any> {
    assertArgsDefined(opId);
    this._emitDatabaseApiCall('killOp', { opId });
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        killOp: 1,
        op: opId
      }
    );
  }

  @returnsPromise
  async shutdownServer(opts: any = {}): Promise<any> {
    this._emitDatabaseApiCall('shutdownServer', { opts: opts });
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        shutdown: 1,
        ...opts
      }
    );
  }

  @returnsPromise
  async fsyncLock(): Promise<any> {
    this._emitDatabaseApiCall('fsyncLock', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        fsync: 1,
        lock: true
      }
    );
  }

  @returnsPromise
  async fsyncUnlock(): Promise<any> {
    this._emitDatabaseApiCall('fsyncUnlock', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        fsyncUnlock: 1
      }
    );
  }

  @returnsPromise
  async version(): Promise<any> {
    this._emitDatabaseApiCall('version', {});
    const info = await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        buildInfo: 1,
      }
    );
    if (!info || info.version === undefined) {
      throw new MongoshRuntimeError(`Error running command serverBuildInfo ${info ? info.errmsg || '' : ''}`);
    }
    return info.version;
  }

  @returnsPromise
  async serverBits(): Promise<any> {
    this._emitDatabaseApiCall('serverBits', {});
    const info = await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        buildInfo: 1,
      }
    );
    if (!info || info.bits === undefined) {
      throw new MongoshRuntimeError(`Error running command serverBuildInfo ${info ? info.errmsg || '' : ''}`);
    }
    return info.bits;
  }

  @returnsPromise
  async isMaster(): Promise<any> {
    this._emitDatabaseApiCall('isMaster', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      {
        isMaster: 1,
      }
    );
  }

  @returnsPromise
  async serverBuildInfo(): Promise<any> {
    this._emitDatabaseApiCall('serverBuildInfo', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        buildInfo: 1,
      }
    );
  }

  @returnsPromise
  async serverStatus(opts = {}): Promise<any> {
    this._emitDatabaseApiCall('serverStatus', { options: opts });
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        serverStatus: 1, ...opts
      }
    );
  }

  @returnsPromise
  async stats(scale = 1): Promise<any> {
    this._emitDatabaseApiCall('stats', { scale: scale });
    return await this._mongo._serviceProvider.runCommandWithCheck(

      ADMIN_DB,
      {
        dbStats: 1,
        scale: scale
      }
    );
  }

  @returnsPromise
  async hostInfo(): Promise<any> {
    this._emitDatabaseApiCall('hostInfo', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      {
        hostInfo: 1,
      }
    );
  }

  @returnsPromise
  async serverCmdLineOpts(): Promise<any> {
    this._emitDatabaseApiCall('serverCmdLineOpts', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(

      ADMIN_DB,
      {
        getCmdLineOpts: 1,
      }
    );
  }

  @returnsPromise
  async printCollectionStats(scale = 1): Promise<any> {
    if (typeof scale !== 'number' || scale < 1) {
      throw new MongoshInvalidInputError(`scale has to be a number >=1, got ${scale}`);
    }
    this._emitDatabaseApiCall('printCollectionStats', { scale: scale });
    const colls = await this.getCollectionNames();
    const result = {};
    for (const c of colls) {
      try {
        result[c] = await this.getCollection(c).stats(scale);
      } catch (error) {
        result[c] = { ok: 0, errmsg: error.message };
      }
    }
    return new CommandResult('StatsResult', result);
  }

  @returnsPromise
  async getFreeMonitoringStatus(): Promise<any> {
    this._emitDatabaseApiCall('getFreeMonitoringStatus', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(

      ADMIN_DB,
      {
        getFreeMonitoringStatus: 1,
      }
    );
  }

  @returnsPromise
  async disableFreeMonitoring(): Promise<any> {
    this._emitDatabaseApiCall('disableFreeMonitoring', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(

      ADMIN_DB,
      {
        setFreeMonitoring: 1,
        action: 'disable'
      }
    );
  }

  @returnsPromise
  async enableFreeMonitoring(): Promise<any> {
    this._emitDatabaseApiCall('enableFreeMonitoring', {});
    const isMaster = await this._mongo._serviceProvider.runCommand(this._name, { isMaster: 1 });
    if (!isMaster.ismaster) {
      throw new MongoshInvalidInputError('db.enableFreeMonitoring() may only be run on a primary');
    }

    // driver should check that ok: 1
    await this._mongo._serviceProvider.runCommand(
      ADMIN_DB,
      {
        setFreeMonitoring: 1,
        action: 'enable'
      }
    );
    let result;
    let error;
    try {
      result = await this._mongo._serviceProvider.runCommand(
        ADMIN_DB,
        { getFreeMonitoringStatus: 1 }
      );
    } catch (err) {
      error = err;
    }
    if (error && error.codeName === 'Unauthorized' || (result && !result.ok && result.codeName === 'Unauthorized')) {
      return 'Unable to determine status as you lack the \'checkFreeMonitoringStatus\' privilege.';
    } else if (error || !result || !result.ok) {
      throw new MongoshRuntimeError(`Error running command setFreeMonitoring ${result ? result.errmsg : error.errmsg}`);
    }
    if (result.state !== 'enabled') {
      const urlResult = await this._mongo._serviceProvider.runCommand(
        ADMIN_DB,
        {
          getParameter: 1,
          cloudFreeMonitoringEndpointURL: 1
        }
      );
      return `Unable to get immediate response from the Cloud Monitoring service. Please check your firewall settings to ensure that mongod can communicate with '${urlResult.cloudFreeMonitoringEndpointURL || '<unknown>'}'`;
    }
    return result;
  }

  @returnsPromise
  async getProfilingStatus(): Promise<any> {
    this._emitDatabaseApiCall('getProfilingStatus', {});
    return await this._mongo._serviceProvider.runCommandWithCheck(

      this._name,
      {
        profile: -1,
      }
    );
  }

  @returnsPromise
  async setProfilingLevel(level: number, opts: any = {}): Promise<any> {
    assertArgsDefined(level);
    if (level < 0 || level > 2) {
      throw new MongoshInvalidInputError(`Input level ${level} is out of range [0..2]`);
    }
    if (typeof opts === 'number') {
      opts = { slowms: opts };
    }
    this._emitDatabaseApiCall('setProfilingLevel', { opts: opts });
    return await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      {
        profile: level,
        ...opts
      }
    );
  }

  @returnsPromise
  async setLogLevel(logLevel: number, component?: any): Promise<any> {
    assertArgsDefined(logLevel);
    this._emitDatabaseApiCall('setLogLevel', { logLevel: logLevel, component: component });
    let componentNames = [];
    if (typeof component === 'string') {
      componentNames = component.split('.');
    } else if (component !== undefined) {
      throw new MongoshInvalidInputError(`setLogLevel component must be a string: got ${typeof component}`);
    }
    let vDoc = { verbosity: logLevel };

    // nest vDoc
    for (let key, obj; componentNames.length > 0;) {
      obj = {};
      key = componentNames.pop();
      obj[key] = vDoc;
      vDoc = obj;
    }

    const cmdObj = { setParameter: 1, logComponentVerbosity: vDoc };

    // TODO: when we implement sessions
    // if (driverSession._isExplicit || !jsTest.options().disableImplicitSessions) {
    //   cmdObj = driverSession._serverSession.injectSessionId(cmdObj);
    // }

    return await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      cmdObj
    );
  }

  @returnsPromise
  async getLogComponents(): Promise<any> {
    this._emitDatabaseApiCall('getLogComponents', {});
    const cmdObj = { getParameter: 1, logComponentVerbosity: 1 };

    // TODO: when we implement sessions
    // if (driverSession._isExplicit || !jsTest.options().disableImplicitSessions) {
    //   cmdObj = driverSession._serverSession.injectSessionId(cmdObj);
    // }

    const result = await this._mongo._serviceProvider.runCommandWithCheck(
      ADMIN_DB,
      cmdObj
    );
    if (!result || result.logComponentVerbosity === undefined) {
      throw new MongoshRuntimeError(`Error running command  ${result ? result.errmsg || '' : ''}`);
    }
    return result.logComponentVerbosity;
  }

  cloneDatabase(): void {
    throw new MongoshUnimplementedError(
      '`cloneDatabase()` was removed because it was deprecated in MongoDB 4.0');
  }

  cloneCollection(): void {
    throw new MongoshUnimplementedError(
      '`cloneCollection()` was removed because it was deprecated in MongoDB 4.0');
  }

  copyDatabase(): void {
    throw new MongoshUnimplementedError(
      '`copyDatabase()` was removed because it was deprecated in MongoDB 4.0');
  }

  async commandHelp(name: string): Promise<any> {
    assertArgsDefined(name);
    this._emitDatabaseApiCall('commandHelp', { name: name });
    const command = {} as any;
    command[name] = 1;
    command.help = true;

    const result = await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      command
    );
    if (!result || result.help === undefined) {
      throw new MongoshRuntimeError(`Error running command listComands ${result ? result.errmsg || '' : ''}`);
    }
    return result.help;
  }

  @returnsPromise
  async listCommands(): Promise<any> {
    this._emitDatabaseApiCall('listCommands', {});
    const result = await this._mongo._serviceProvider.runCommandWithCheck(
      this._name,
      {
        listCommands: 1,
      }
    );
    if (!result || result.commands === undefined) {
      throw new MongoshRuntimeError(`Error running command listCommands ${result ? result.errmsg || '' : ''}`);
    }
    return new CommandResult('ListCommandsResult', result.commands);
  }

  @returnsPromise
  async getLastErrorObj(w?: number|string, wTimeout?: number, j?: boolean): Promise<any> {
    this._emitDatabaseApiCall('getLastErrorObj', { w: w, wTimeout: wTimeout, j: j });

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
        cmd
      );
    } catch (e) {
      return e;
    }
  }

  @returnsPromise
  async getLastError(w?: number|string, wTimeout?: number): Promise<any> {
    this._emitDatabaseApiCall('getLastError', { w: w, wTimeout: wTimeout });
    const result = await this.getLastErrorObj(w, wTimeout);
    return result.err || null;
  }

  @returnsPromise
  async printShardingStatus(verbose = false): Promise<any> {
    this._emitDatabaseApiCall('printShardingStatus', { verbose });
    const result = await getPrintableShardStatus(this._mongo, verbose);
    return new CommandResult('StatsResult', result);
  }
}
