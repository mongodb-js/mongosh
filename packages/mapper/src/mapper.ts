import {
  Database,
  CursorIterationResult,
  CommandResult
} from '@mongosh/shell-api';

import {
  ServiceProvider,
} from '@mongosh/service-provider-core';

import { EventEmitter } from 'events';
import DatabaseMapper from './database-mapper';
import { CollectionMapper } from './collection-mapper';

export default class Mapper {
  private serviceProvider: ServiceProvider;
  public databases: any;
	private messageBus: EventEmitter;
  public context: any;
  public databaseMapper: DatabaseMapper;
  public collectionMapper: CollectionMapper;

  constructor(serviceProvider, messageBus?) {
    this.serviceProvider = serviceProvider;
    this.messageBus = messageBus || new EventEmitter();

    this.collectionMapper = new CollectionMapper(
      serviceProvider,
      messageBus
    );

    this.databaseMapper = new DatabaseMapper(
      this.collectionMapper,
      serviceProvider,
      messageBus
    );

    this.databases = { test: new Database(this.databaseMapper, 'test') };
  }

  use(db): any {
    if (!(db in this.databases)) {
      this.databases[db] = new Database(this.databaseMapper, db);
    }
    this.messageBus.emit(
      'mongosh:use',
      { method: 'use', arguments: { db: db } }
    );

    this.context.db = this.databases[db];

    return `switched to db ${db}`;
  }

  async show(arg): Promise<CommandResult> {
    this.messageBus.emit(
      'mongosh:show',
      {
        arguments: { arg }
      }
    );

    switch (arg) {
      case 'databases':
      case 'dbs':
        return await this.showDatabases();
      case 'collections':
      case 'tables':
        return await this.showCollections();
      default:
        const err = new Error(`Error: don't know how to show ${arg}`); // TODO: which error obj
        this.messageBus.emit('mongosh:error', err);
        throw err;
    }
  }

  private async showCollections(): Promise<CommandResult> {
    const collectionNames = await this.databaseMapper.getCollectionNames(this.context.db);
    return new CommandResult('ShowCollectionsResult', collectionNames.join('\n'));
  }

  private async showDatabases(): Promise<CommandResult> {
    const result = await this.serviceProvider.listDatabases('admin');
    if (!('databases' in result)) {
      const err = new Error('Error: invalid result from listDatabases');
      this.messageBus.emit('mongosh:error', err);
      throw err;
    }
    return new CommandResult('ShowDatabasesResult', result.databases);
  }

  async it(): Promise<any> {
    const results = new CursorIterationResult();

    if (
      !this.collectionMapper.currentCursor ||
      this.collectionMapper.currentCursor.isClosed()
    ) {
      return results;
    }

    for (let i = 0; i < 20; i++) { // TODO: ensure that assigning cursor doesn't iterate
      if (!await this.collectionMapper.currentCursor.hasNext()) {
        this.messageBus.emit(
          'mongosh:it',
          { method: 'it', arguments: { result: 'no cursor' } }
        );
        break;
      }

      results.push(await this.collectionMapper.currentCursor.next());
    }

    this.messageBus.emit(
      'mongosh:it',
      { method: 'it', arguments: { result: results.length } }
    );
    return results;
  }
}
