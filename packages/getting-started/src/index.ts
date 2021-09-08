import { signatures, ShellInstanceState, TypeSignature, Mongo } from '@mongosh/shell-api';
import {
  Document,
  DbOptions,
  ServiceProvider,
  ServiceProviderCore,
  FindCursor,
  FindOptions,
  EstimatedDocumentCountOptions,
  CountDocumentsOptions,
  CountOptions,
  DropCollectionOptions,
  UpdateResult,
  InsertManyResult,
  InsertOneResult,
  InsertOneOptions,
  UpdateOptions,
  BulkWriteOptions,
  DeleteResult,
  DeleteOptions,
  DropDatabaseOptions,
  RunCommandOptions,
  CreateCollectionOptions,
  ListDatabasesOptions,
  ListCollectionsOptions,
  ReplPlatform,
} from '@mongosh/service-provider-core';
import type { MongoshBus } from '@mongosh/types';
import bson from 'bson';
import Datastore from 'nedb-promises';

class NotSupportedError extends Error {
  constructor() {
    super('This operation is not supported in this environment');
  }
}

function track(target: NedbServiceProvider, propertyKey: keyof ServiceProvider, descriptor: PropertyDescriptor) {
  const orig = descriptor.value;
  const wrapper = function(this: NedbServiceProvider, ...args: any[]) {
    this.calls[propertyKey] = (this.calls[propertyKey] ?? 0) + 1;
    return orig.call(this, ...args);
  };
  Object.setPrototypeOf(wrapper, Object.getPrototypeOf(orig));
  Object.defineProperties(wrapper, Object.getOwnPropertyDescriptors(orig));
  descriptor.value = wrapper;
}

class NedbServiceProvider extends ServiceProviderCore implements ServiceProvider {
  dbs: Map<string, Map<string, Datastore>>;
  platform: ReplPlatform;
  initialDb: string;
  calls: {[key in keyof ServiceProvider | 'findWithPredicate']?: number} = {};

  constructor() {
    super(bson);
    this.dbs = new Map();
    this.platform = 'getting-started' as any;
    this.initialDb = 'gettingstarted';
  }

  @track
  async close(): Promise<void> {
    this.dbs = new Map();
  }

  @track
  async suspend(): Promise<() => Promise<void>> {
    return async() => {};
  }

  @track
  async listDatabases(database: string, options?: ListDatabasesOptions): Promise<Document> {
    return {
      databases: [...this.dbs.keys()].map(key => {
        return options?.nameOnly ? { name: key } : { name: key, sizeOnDisk: 0, empty: false };
      })
    };
  }

  @track
  async listCollections(
    database: string,
    filter?: Document,
    options?: ListCollectionsOptions,
    dbOptions?: DbOptions): Promise<Document[]> {
    const db = this.db(database);
    return [...db.keys()].map(key => {
      return { name: key, type: 'collection' };
    });
  }

  getNewConnection(): never { throw new NotSupportedError(); }
  authenticate(): never { throw new NotSupportedError(); }
  getReadPreference(): never { throw new NotSupportedError(); }
  getReadConcern(): never { throw new NotSupportedError(); }
  getWriteConcern(): never { throw new NotSupportedError(); }
  resetConnectionOptions(): never { throw new NotSupportedError(); }
  startSession(): never { throw new NotSupportedError(); }
  bulkWrite(): never { throw new NotSupportedError(); }
  findOneAndDelete(): never { throw new NotSupportedError(); }
  findOneAndReplace(): never { throw new NotSupportedError(); }
  findOneAndUpdate(): never { throw new NotSupportedError(); }
  replaceOne(): never { throw new NotSupportedError(); }
  remove(): never { throw new NotSupportedError(); }
  createIndexes(): never { throw new NotSupportedError(); }
  renameCollection(): never { throw new NotSupportedError(); }
  initializeBulkOp(): never { throw new NotSupportedError(); }
  aggregate(): never { throw new NotSupportedError(); }
  aggregateDb(): never { throw new NotSupportedError(); }
  distinct(): never { throw new NotSupportedError(); }
  readPreferenceFromOptions(): never { throw new NotSupportedError(); }
  stats(): never { throw new NotSupportedError(); }
  watch(): never { throw new NotSupportedError(); }
  getRawClient(): undefined { return undefined; }
  getTopology(): any { return {}; }

  getURI(): string | undefined {
    return 'mongodb://getmestarted.mongosh.fakehost/';
  }

  @track
  async getConnectionInfo(): Promise<Document> {
    return {};
  }

  private db(name: string): Map<string, Datastore> {
    if (!this.dbs.has(name)) {this.dbs.set(name, new Map());}
    return this.dbs.get(name) as Map<string, Datastore>;
  }

  private coll(dbName: string, collName: string): Datastore {
    const db = this.db(dbName);
    if (!db.has(collName)) {db.set(collName, new Datastore({ inMemoryOnly: true }));}
    return db.get(collName) as Datastore;
  }

  @track
  async createCollection(
    dbName: string,
    collName: string,
    options: CreateCollectionOptions,
    dbOptions?: DbOptions): Promise<{ ok: number }> {
    return { ok: 1 };
  }

  @track
  async runCommand(
    db: string,
    spec: Document,
    options: RunCommandOptions,
    dbOptions?: DbOptions
  ): Promise<Document> {
    return { ok: 1 };
  }

  @track
  async runCommandWithCheck(
    db: string,
    spec: Document,
    options: RunCommandOptions,
    dbOptions?: DbOptions
  ): Promise<Document> {
    return { ok: 1 };
  }

  @track
  async dropDatabase(
    database: string,
    options: DropDatabaseOptions,
    dbOptions?: DbOptions
  ): Promise<Document> {
    this.dbs.delete(database);
    return { ok: 1 };
  }

  @track
  async deleteMany(
    database: string,
    collection: string,
    filter: Document,
    options: DeleteOptions,
    dbOptions?: DbOptions): Promise<DeleteResult> {
    const deletedCount = await this.coll(database, collection).remove(filter, { ...options, multi: true });
    return { acknowledged: true, deletedCount };
  }

  @track
  async deleteOne(
    database: string,
    collection: string,
    filter: Document,
    options: DeleteOptions,
    dbOptions?: DbOptions): Promise<DeleteResult> {
    const deletedCount = await this.coll(database, collection).remove(filter, { ...options, multi: false });
    return { acknowledged: true, deletedCount };
  }

  @track
  async insertMany(
    database: string,
    collection: string,
    docs: Document[],
    options: BulkWriteOptions,
    dbOptions?: DbOptions): Promise<InsertManyResult> {
    await this.coll(database, collection).insert(docs);
    return {
      acknowledged: true,
      insertedCount: docs.length
    } as InsertManyResult;
  }

  @track
  async insertOne(
    database: string,
    collection: string,
    doc: Document,
    options: InsertOneOptions,
    dbOptions?: DbOptions): Promise<InsertOneResult> {
    return await this.insertMany(database, collection, [doc], options, dbOptions) as unknown as InsertOneResult;
  }

  @track
  async updateMany(
    database: string,
    collection: string,
    filter: Document,
    update: Document,
    options?: UpdateOptions,
    dbOptions?: DbOptions): Promise<UpdateResult> {
    await this.coll(database, collection).update(filter, update, { ...options, multi: true });
    return {
      acknowledged: true
    } as UpdateResult;
  }

  @track
  async updateOne(
    database: string,
    collection: string,
    filter: Document,
    update: Document,
    options?: UpdateOptions,
    dbOptions?: DbOptions): Promise<UpdateResult> {
    await this.coll(database, collection).update(filter, update, { ...options, multi: false });
    return {
      acknowledged: true
    } as UpdateResult;
  }

  @track
  async dropCollection(
    database: string,
    collection: string,
    options: DropCollectionOptions,
    dbOptions?: DbOptions
  ): Promise<boolean> {
    const db = this.db(database);
    const hadCollection = db.has(collection);
    db.delete(collection);
    return hadCollection;
  }

  @track
  async count(
    db: string,
    coll: string,
    query?: Document,
    options?: CountOptions,
    dbOptions?: DbOptions): Promise<number> {
    return await this.coll(db, coll).count(query);
  }

  @track
  async countDocuments(
    database: string,
    collection: string,
    filter?: Document,
    options?: CountDocumentsOptions,
    dbOptions?: DbOptions): Promise<number> {
    return await this.count(database, collection, filter, options, dbOptions);
  }

  @track
  async estimatedDocumentCount(
    database: string,
    collection: string,
    options?: EstimatedDocumentCountOptions,
    dbOptions?: DbOptions): Promise<number> {
    return await this.count(database, collection, {}, options, dbOptions);
  }

  @track
  find(
    database: string,
    collection: string,
    filter?: Document,
    options?: FindOptions,
    dbOptions?: DbOptions): FindCursor {
    if (filter && Object.keys(filter).length > 0) {
      this.calls.findWithPredicate = (this.calls.findWithPredicate ?? 0) + 1;
    }

    const cursor = this.coll(database, collection).find(filter, options?.projection);
    let docs: Document[] | null = null;
    let initialized = false;
    async function initialize(): Promise<void> {
      if (!initialized) {
        docs = await cursor.exec();
        initialized = true;
      }
    }
    return new class {
      clone(): never { throw new NotSupportedError(); }
      map(): never { throw new NotSupportedError(); }
      forEach(): never { throw new NotSupportedError(); }
      count(): never { throw new NotSupportedError(); }
      explain(): never { throw new NotSupportedError(); }
      filter(): never { throw new NotSupportedError(); }
      min(): never { throw new NotSupportedError(); }
      max(): never { throw new NotSupportedError(); }
      returnKey(): never { throw new NotSupportedError(); }
      showRecordId(): never { throw new NotSupportedError(); }
      addQueryModifier(): never { throw new NotSupportedError(); }
      project(): never { throw new NotSupportedError(); }
      rewind(): never { throw new NotSupportedError(); }
      get namespace(): never { throw new NotSupportedError(); }
      get readPreference(): never { throw new NotSupportedError(); }
      get readConcern(): never { throw new NotSupportedError(); }
      get killed(): never { throw new NotSupportedError(); }
      hint(): this { return this; }
      comment(): this { return this; }
      maxAwaitTimeMS(): this { return this; }
      maxTimeMS(): this { return this; }
      allowDiskUse(): this { return this; }
      collation(): this { return this; }
      addCursorFlag(): this { return this; }
      withReadPreference(): this { return this; }
      withReadConcern(): this { return this; }
      batchSize(): this { return this; }
      bufferedCount(): number { return docs?.length ?? 0; }
      get loadBalanced(): boolean { return false; }
      sort(spec: any): this {
        cursor.sort(spec);
        return this;
      }
      limit(value: number): this {
        cursor.sort(value);
        return this;
      }
      skip(value: number): this {
        cursor.skip(value);
        return this;
      }
      async hasNext(): Promise<boolean> {
        await initialize();
        return !this.closed;
      }
      async next(): Promise<Document | null> {
        await initialize();
        const doc = docs?.shift?.() ?? null;
        if (!doc) {
          docs = null;
        }
        return doc;
      }
      async tryNext(): Promise<Document | null> {
        return this.next();
      }
      close(): void {
        docs = null;
      }
      get closed(): boolean {
        return initialized && (!docs || docs.length === 0);
      }
      async toArray(): Promise<Document[]> {
        await initialize();
        const ret = docs;
        docs = null;
        return ret as Document[];
      }
      async* [Symbol.asyncIterator](): AsyncIterator<Document, void> {
        yield* await this.toArray();
      }
    } as unknown as FindCursor;
  }

  @track
  async isCapped(
    database: string,
    collection: string,
    dbOptions?: DbOptions): Promise<boolean> {
    return false;
  }

  @track
  async getIndexes(): Promise<Document[]> {
    return [];
  }
}

export interface GettingStartedOptions {
  instanceState: ShellInstanceState;
  displayPrompt: () => void;
}

enum GettingStartedProgress {
  Initial,
  UseDb,
  ShowCollections,
  SimpleFind,
  InsertOne,
  InsertOneWithBSON,
  InsertOneWithBSONCheck,
  FindWithPredicate,
  UpdateOne
}

const RESET_NOTICE = '(To leave ‘getting started’ mode at any time, enter ‘reset’.)';

export class GettingStartedManager {
  _instanceState: ShellInstanceState;
  _displayPrompt: () => void;
  _mongo: Mongo | null = null;
  _sp: NedbServiceProvider = new NedbServiceProvider();
  _lastCalls: NedbServiceProvider['calls'] = {};
  _origDb: any;
  _progress: GettingStartedProgress = GettingStartedProgress.Initial;

  constructor({ instanceState, displayPrompt }: GettingStartedOptions) {
    this._instanceState = instanceState;
    this._displayPrompt = displayPrompt;

    // TODO: This is a terrible way to add functionality to the shell and
    // currently forces GettingStartedManager to be a singleton.
    const introFn = () => {
      return Object.assign(this.start(), {
        [Symbol.for('@@mongosh.syntheticPromise')]: true
      });
    };
    introFn.returnsPromise = true;
    introFn.isDirectShellCommand = true;
    (instanceState.shellApi as any).intro = instanceState.context.intro = introFn;
    (signatures.ShellApi.attributes as any).intro = {
      type: 'function',
      returnsPromise: true,
      isDirectShellCommand: true
    } as TypeSignature;

    const resetFn = () => {
      return Object.assign(this.reset(), {
        [Symbol.for('@@mongosh.syntheticPromise')]: true
      });
    };
    resetFn.returnsPromise = true;
    resetFn.isDirectShellCommand = true;
    (instanceState.shellApi as any).reset = instanceState.context.reset = resetFn;
    (signatures.ShellApi.attributes as any).reset = {
      type: 'function',
      returnsPromise: true,
      isDirectShellCommand: true
    } as TypeSignature;
  }

  get messageBus(): MongoshBus {
    return this._instanceState.messageBus;
  }

  async _print(text: string): Promise<void> {
    await this._instanceState.shellApi.print(text);
  }

  async start(): Promise<void> {
    if (this._mongo) {
      throw new Error('Already in getting-started mode! Enter `reset` to leave this mode.');
    }
    this._mongo = new Mongo(this._instanceState, this._sp.getURI(), undefined, undefined, this._sp);
    this._origDb = this._instanceState.currentDb;
    this._instanceState.mongos.push(this._mongo);
    this._instanceState.setDbFunc(this._mongo.getDB('test'));

    this.messageBus.addListener('mongosh:eval-complete', this.onAfterEval);
  }

  onAfterEval = async() => {
    const mongo = this._mongo as Mongo;
    await new Promise(resolve => setTimeout(resolve, 10));
    await this._print('\n----------------');
    switch (this._progress) {
      case GettingStartedProgress.Initial:
        this._progress = GettingStartedProgress.UseDb;
        this._lastCalls = { ...this._sp.calls };

        await mongo.getDB('test').getCollection('test')
          .insertOne({ description: 'Document in the test collection in the test db' });
        await mongo.getDB('gettingstarted').getCollection('test')
          .insertOne({ description: 'Document in the test collection in the gettingstarted db' });
        await this._print(
          'Welcome to mongosh!\n' +
          'You are now ‘connected’ to a fake database, "test".\n' +
          'In mongosh you can use the `use` command to switch between different databases\n' +
          'on the same host.\n' +
          'Let’s start by switching to the "gettingstarted" database now.\n' +
          RESET_NOTICE);
        break;
      case GettingStartedProgress.UseDb:
        if (this._instanceState.currentDb.getName() === 'gettingstarted') {
          this._progress = GettingStartedProgress.ShowCollections;
          this._lastCalls = { ...this._sp.calls };
          await this._print(
            'Awesome!\n' +
            '\n' +
            'One command you will be using a lot with mongosh is `show`.\n' +
            'Try running `show collections` to see which collections are currently in\n' +
            'this database. (You can also write `show c` and then press TAB\n' +
            'to automatically complete the rest of the command!)');
        } else {
          await this._print(
            'This did not quite work. Maybe have a look at the documentation?\n' +
            '  https://docs.mongodb.com/mongodb-shell/run-commands/\n' +
            RESET_NOTICE);
        }
        break;
      case GettingStartedProgress.ShowCollections:
        if ((this._sp.calls.listCollections ?? 0) > (this._lastCalls.listCollections ?? 0)) {
          this._progress = GettingStartedProgress.SimpleFind;
          this._lastCalls = { ...this._sp.calls };
          await this._print(
            'Great!\n' +
            '\n' +
            'Now let’s actually look at our data. As you can see, there is\n' +
            'a `test` collection in the current database. You can use\n' +
            '`db.test.find()` to look at its contents. (`db` refers to the\n' +
            'current database, `db.test` refers to the collection ‘test’ in the\n' +
            'current database.)');
        } else {
          await this._print(
            'Looks like you ran something else. Maybe the documentation is helpful?\n' +
            '  https://docs.mongodb.com/manual/reference/mongo-shell/\n' +
            RESET_NOTICE);
        }
        break;
      case GettingStartedProgress.SimpleFind:
        if ((this._sp.calls.find ?? 0) > (this._lastCalls.find ?? 0)) {
          this._progress = GettingStartedProgress.InsertOne;
          this._lastCalls = { ...this._sp.calls };
          await this._print(
            'Wonderful!\n' +
            '\n' +
            'As you might have guessed, you don’t just use mongosh to look at your data,\n' +
            'you can also use it to add and modify data. This, time we will be using\n' +
            'the `db.test.insertOne({ ... })` command. The curly braces contain the fields\n' +
            'that the new document will contain. If you are unfamiliar with this syntax,\n' +
            'consider taking a look at the documentation:\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/');
        } else {
          await this._print(
            'Looks like you ran something other than a find query (db.test.find(...)).\n' +
            'Maybe the documentation is helpful?\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.find/\n' +
            RESET_NOTICE);
        }
        break;
      case GettingStartedProgress.InsertOne:
        if ((this._sp.calls.insertOne ?? 0) > (this._lastCalls.insertOne ?? 0)) {
          this._progress = GettingStartedProgress.InsertOneWithBSON;
          this._lastCalls = { ...this._sp.calls };
          await this._print(
            'That worked perfectly!\n' +
            '\n' +
            'MongoDB uses a format called BSON for storing the fields of its documents.\n' +
            'That means that you can insert documents that contain a lot of basic types\n' +
            'supported by other formats like JSON, for example numbers and strings,\n' +
            'but also more advanced concepts like dates.\n' +
            'You can use `ISODate()` or `new Date()` in mongosh to refer to the current\n' +
            'date and time. Let’s insert a document that contains a field whose value\n' +
            'is a date now!\n' +
            '\n' +
            'Here are some relevant documentation pages:\n' +
            '  https://docs.mongodb.com/manual/reference/method/Date/\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/');
        } else {
          await this._print(
            'I don’t think that was an insertOne() call.\n' +
            'Maybe the documentation is helpful?\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/\n' +
            RESET_NOTICE);
        }
        break;
      case GettingStartedProgress.InsertOneWithBSON:
        let hasDateDoc = false;
        for (const db of this._sp.dbs.values()) {
          for (const coll of db.values()) {
            for (const doc of await coll.find({}).exec()) {
              for (const val of Object.values(doc)) {
                if (Object.prototype.toString.call(val) === '[object Date]') {
                  hasDateDoc = true;
                }
              }
            }
          }
        }
        if (hasDateDoc) {
          this._progress = GettingStartedProgress.InsertOneWithBSONCheck;
          this._lastCalls = { ...this._sp.calls };
          await this._print(
            'Woo!\n' +
            '\n' +
            'Keep in mind that you can always use `db.test.find()` to look at the\n' +
            'data you have inserted. Let’s do that now!\n' +
            '\n' +
            'Here are some relevant documentation pages:\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.find/\n');
        } else {
          await this._print(
            'Sorry, I couldn’t find any documents with a Date field in the database.\n' +
            'Maybe the documentation is helpful?\n' +
            '  https://docs.mongodb.com/manual/reference/method/Date/\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/\n' +
            RESET_NOTICE);
        }
        break;
      case GettingStartedProgress.InsertOneWithBSONCheck:
        if ((this._sp.calls.find ?? 0) > (this._lastCalls.find ?? 0)) {
          this._progress = GettingStartedProgress.FindWithPredicate;
          this._lastCalls = { ...this._sp.calls };
          await (this._mongo as Mongo).getDB('gettingstarted').getCollection('movies').insertMany([
            { title: 'Rushmore', year: 1998 },
            { title: 'Everything Will Be Ok', year: 2005 },
            { title: 'Bernard and Doris', year: 2006 },
            { title: 'Out at the Wedding', year: 2007 },
            { title: 'On the Riviera', year: 1951 },
            { title: 'The Return of Swamp Thing', year: 1989 },
            { title: 'Twin Town', year: 1997 },
            { title: 'The Oak', year: 1992 }
          ]);

          await this._print(
            'Isn’t that nice?\n' +
            '\n' +
            'You can do more things with `.find()` than just listing all data there is.\n' +
            'You can pass a filter to `.find()` to only look for documents that match\n' +
            'specific properties. For example, `db.people.find({ age: 42 })` will list\n' +
            'all documents in the `people` collection in the current database whose `age`\n' +
            'field has the value `42`.\n' +
            'In this scenario, the `movies` collection contains entries for a few movies\n' +
            'and the years in which they were released. Let’s maybe try to find a movie\n' +
            'that has been released in 1989?\n' +
            '\n' +
            'In any case, here’s the docs for `.find()` it they are useful:\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.find/');
        } else {
          await this._print(
            'Looks like you ran something other than a find query (db.test.find(...)).\n' +
            'Maybe the documentation is helpful?\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.find/\n' +
            RESET_NOTICE);
        }
        break;
      case GettingStartedProgress.FindWithPredicate:
        if ((this._sp.calls.findWithPredicate ?? 0) > (this._lastCalls.findWithPredicate ?? 0)) {
          this._progress = GettingStartedProgress.UpdateOne;
          this._lastCalls = { ...this._sp.calls };
          await this._print(
            'Almost done!\n' +
            '\n' +
            'It turns out that ‘Everything Will Be Ok’ was actually released in\n' +
            '2006, not 2005. Let’s fix this mistake!\n' +
            'MongoDB provides a `db.movies.updateOne()` method that lets you change\n' +
            'the contents of a single document. It takes two arguments:\n' +
            'First, a filter like the one you used for `.find()`, and second,\n' +
            'a document that specifies how exactly the database document should be\n' +
            'updated. For us, it’s enough to know that we can pass `{$set: {field: value}}`\n' +
            'to set a specific field to a specific value.' +
            '\n' +
            'Take a look at the updateOne docs for all the details:\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.updateOne/');
        } else {
          await this._print(
            'Looks like you ran something other than a find query with a predicate\n' +
            '(i.e. db.test.find({ field1: value1, ... })).\n' +
            'Maybe the documentation is helpful?\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.find/\n' +
            RESET_NOTICE);
        }
        break;
      case GettingStartedProgress.UpdateOne:
        if ((this._sp.calls.updateOne ?? 0) > (this._lastCalls.updateOne ?? 0)) {
          await this.reset();
          await this._print(
            'Woohoo! We’re done with this little intro guide.\n' +
            'Be sure to check out our documentation to learn what else mongosh can do!\n' +
            '(The shell will not reset into its previous state.)');
        } else {
          await this._print(
            'The date for ‘Everything Will Be Ok’ is still 2005 – that’s okay, but we\n' +
            'really would like to change it.\n' +
            'Take a look at the docs to see how `.updateOne()` is used:\n' +
            '  https://docs.mongodb.com/manual/reference/method/db.collection.update/\n' +
            RESET_NOTICE);
        }
        break;
    }
    await this._print('----------------');
    this._displayPrompt();
  };

  async reset(): Promise<void> {
    if (this._origDb) {
      this._progress = GettingStartedProgress.Initial;
      const ix = this._instanceState.mongos.indexOf(this._mongo as Mongo);
      this._instanceState.mongos.splice(ix, 1);
      this._mongo = null;
      this._sp = new NedbServiceProvider();
      this.messageBus.removeListener('mongosh:eval-complete', this.onAfterEval);
      this._instanceState.setDbFunc(this._origDb);
      this._origDb = null;
    }
  }
}
