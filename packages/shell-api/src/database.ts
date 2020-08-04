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
  processDigestPassword
} from './helpers';

import {
  Cursor as ServiceProviderCursor,
  Document,
  WriteConcern
} from '@mongosh/service-provider-core';
import { AggregationCursor } from './index';
import { MongoshInvalidInputError, MongoshUnimplementedError } from '@mongosh/errors';

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
    this._emitDatabaseApiCall('runCommand', { cmd });
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
    this._emitDatabaseApiCall( 'adminCommand', { cmd });
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
    const cursor = new AggregationCursor(this, providerCursor);

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
    assertArgsDefined(user.user, user.roles, user.pwd);
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
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      orderedCmd
    );
  }

  @returnsPromise
  async logout(): Promise<any> {
    this._emitDatabaseApiCall('logout', {});
    return await this._mongo._serviceProvider.runCommand(this._name, { logout: 1 });
  }

  @returnsPromise
  async dropUser(username: string, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(username);
    this._emitDatabaseApiCall('dropUser', {});
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      { dropUser: username, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async dropAllUsers(writeConcern: WriteConcern = {}): Promise<any> {
    this._emitDatabaseApiCall('dropAllUsers', {});
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      { grantRolesToUser: username, writeConcern: writeConcern, roles: roles }
    );
  }

  @returnsPromise
  async revokeRolesFromUser(username: string, roles: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(username, roles);
    this._emitDatabaseApiCall('revokeRolesFromUser', {});
    return await this._mongo._serviceProvider.runCommand(
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
    const result = await this._mongo._serviceProvider.runCommand(
      this._name,
      command
    );
    if (!result.ok) {
      return result;
    }
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
    return await this._mongo._serviceProvider.runCommand(
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
    assertArgsDefined(role.role, role.privileges, role.roles);
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
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      orderedCmd
    );
  }

  @returnsPromise
  async dropRole(rolename: string, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename);
    this._emitDatabaseApiCall('dropRole', {});
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      { dropRole: rolename, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async dropAllRoles(writeConcern: WriteConcern = {}): Promise<any> {
    this._emitDatabaseApiCall('dropAllRoles', {});
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      { dropAllRolesFromDatabase: 1, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async grantRolesToRole(rolename: string, roles: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, roles);
    this._emitDatabaseApiCall('grantRolesToRole', {});
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      { grantRolesToRole: rolename, roles: roles, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async revokeRolesFromRole(rolename: string, roles: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, roles);
    this._emitDatabaseApiCall('revokeRolesFromRole', {});
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      { revokeRolesFromRole: rolename, roles: roles, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async grantPrivilegesToRole(rolename: string, privileges: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, privileges);
    this._emitDatabaseApiCall('grantPrivilegesToRole', {});
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      { grantPrivilegesToRole: rolename, privileges: privileges, writeConcern: writeConcern }
    );
  }

  @returnsPromise
  async revokePrivilegesFromRole(rolename: string, privileges: any, writeConcern: WriteConcern = {}): Promise<any> {
    assertArgsDefined(rolename, privileges);
    this._emitDatabaseApiCall('revokePrivilegesFromRole', {});
    return await this._mongo._serviceProvider.runCommand(
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
    const result = await this._mongo._serviceProvider.runCommand(
      this._name,
      command
    );
    if (!result.ok) {
      return result;
    }
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
    return await this._mongo._serviceProvider.runCommand(
      this._name,
      command
    );
  }

  @returnsPromise
  async currentOp(opts: any = {}): Promise<any> {
    this._emitDatabaseApiCall('currentOp', { opts: opts });
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
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
    return await this._mongo._serviceProvider.runCommand(
      ADMIN_DB,
      {
        fsyncUnlock: 1
      }
    );
  }
}
