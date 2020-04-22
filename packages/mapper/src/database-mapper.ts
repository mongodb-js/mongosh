import { ServiceProvider, Document } from '@mongosh/service-provider-core';
import { Collection, Database } from '@mongosh/shell-api';
import { CollectionMapper } from './collection-mapper';
import { EventEmitter } from 'events';

export default class DatabaseMapper {
  private serviceProvider: ServiceProvider;
  private messageBus: EventEmitter;
  private collections: {[collectionName: string]: Collection};
  private collectionMapper: CollectionMapper;

  constructor(
    collectionMapper: CollectionMapper,
    serviceProvider: ServiceProvider,
    messageBus: EventEmitter
  ) {
    this.serviceProvider = serviceProvider;
    this.messageBus = messageBus;
    this.collections = {};
    this.collectionMapper = collectionMapper;
  }

  getCollection(database: Database, name: string): Collection {
    if (!this.collections[name]) {
      this.collections[name] = new Collection(
        this.collectionMapper,
        database._name,
        name
      );
    }

    return this.collections[name];
  }

  getName(database: Database): string {
    return database._name;
  }

  /**
   * Returns an array of collection infos
   *
   * @param {String} database - The database.
   * @param {Document} filter - The filter.
   * @param {Document} options - The options.
   *
   * @return {Promise}
   */
  async getCollectionInfos(
    database: Database,
    filter: Document = {},
    options: Document = {}): Promise<any> {
    const db = database._name;
    this.messageBus.emit(
      'mongosh:api-call',
      {
        method: 'getCollectionInfos',
        class: 'Database',
        db, arguments: { filter, options }
      }
    );

    return await this.serviceProvider.listCollections(
      db,
      filter,
      options
    );
  }

  /**
   * Returns an array of collection names
   *
   * @param {String} database - The database.
   * @param {Document} filter - The filter.
   * @param {Document} options - The options.
   *
   * @return {Promise}
   */
  async getCollectionNames(
    database: Database
  ): Promise<any> {
    this.messageBus.emit(
      'mongosh:api-call',
      { method: 'getCollectionNames', class: 'Database', db: database._name }
    );

    const infos = await this.getCollectionInfos(
      database,
      {},
      { nameOnly: true }
    );

    return infos.map(collection => collection.name);
  }

  /**
   * Run a command against the db.
   *
   * @param {Database} database - the db object.
   * @param {Object} cmd - the command spec.
   *
   * @returns {Promise} The promise of command results. TODO: command result object
   */
  runCommand(database, cmd): Promise<any> {
    const db = database._name;
    this.messageBus.emit(
      'mongosh:api-call',
      { method: 'runCommand', class: 'Database', db, arguments: { cmd } }
    );

    return this.serviceProvider.runCommand(db, cmd);
  }
}
