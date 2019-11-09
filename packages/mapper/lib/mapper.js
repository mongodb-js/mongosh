const { Database, Cursor } = require('mongosh-shell-api');

class Mapper {
  constructor(serviceProvider) {
    this._serviceProvider = serviceProvider;
  }

  setCtx(ctx) {
    this._ctx = ctx;
    this._ctx.db = new Database(this, 'test');
  };

  /**
   * RunCommand
   * @param database {Database} - reference to the database object this method is called from.
   * @param cmd {Object} - command spec
   * @return {*} TODO
   */
  runCommand(database, cmd) {
    return this._serviceProvider.runCommand(database.database, cmd);
  };

  use(_, db) {
    this._ctx.db = new Database(this, db);
    return `switched to db ${db}`;
  };

  /**
   * Aggregate command
   *
   * TODO: In the mongo shell, if the cursor returned from the db.collection.aggregate() is not assigned to a variable using the var keyword, then the mongo shell automatically iterates the cursor up to 20 times. See Iterate a Cursor in the mongo Shell for handling cursors in the mongo shell.
   *
   * @param collection {Collection} - reference to the collection object this method is called from.
   * @param pipeline {Array} - pipeline array
   * @param options {Object} - options
   *
   * @return {ShellApi.Cursor} - newly instantiated cursor object
   */
  aggregate(collection, pipeline, options) {
    return new Cursor( // TODO: probably agg cursor class
      this,
      this._serviceProvider.aggregate(
        collection.database,
        collection.collection,
        pipeline,
        options,
      ),
    );
  };

  /**
   * Bulk write command
   *
   * @param collection {Collection} - reference to the collection object this method is called from.
   * @param operations {Object} - the bulk write operations
   * @param options {Object}
   *      writeConcern {Object} - write concern object
   *      ordered {bool} - if ordered
   *
   * @return {boolean} - A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
   */
  bulkWrite(collection, operations, options) {
    this._serviceProvider.bulkWrite(
      collection.database,
      collection.collection,
      operations,
      options,
    )
  };

  /**
   * Count
   *
   * @param collection {Collection} - reference to the collection object this method is called from.
   * @param query {Object} - query spec
   * @param options {Object} - options
   *
   * @returns {integer}
   */
  count(collection, query, options) {
    return this._serviceProvider.count(
      collection.database,
      collection.collection,
      query,
      options,
    )
  };

  /**
   * CountDocuments
   *
   * @param collection {Collection} - reference to the collection object this method is called from.
   * @param query {Object} - query spec
   * @param options {Object} - options
   *
   * @returns {integer}
   */
  countDocuments(collection, query, options) {
    return this._serviceProvider.countDocuments(
      collection.database,
      collection.collection,
      query,
      options,
    )
  };

  deleteMany(collection, filter, options) {
    return this._serviceProvider.deleteMany(
      collection.database,
      collection.collection,
      filter,
      options,
    )
  };

  deleteOne(collection, filter, options) {
    return this._serviceProvider.deleteOne(
      collection.database,
      collection.collection,
      filter,
      options,
    )
  };

  distinct(collection, field, query, options) {
    return this._serviceProvider.distinct(
      collection.database,
      collection.collection,
      field,
      query,
      options,
    );
  };

  estimatedDocumentCount(collection, options) {
    return this._serviceProvider.estimatedDocumentCount(
      collection.database,
      collection.collection,
      options,
    );
  };

  find(collection, query, projection) {
    return new Cursor(
      this,
      this._serviceProvider.find(
        collection.database,
        collection.collection,
        query,
        projection,
      ),
    );
  };

  findOne(collection, query, projection) {
    return new Cursor(
      this,
      this._serviceProvider.find(
        collection.database,
        collection.collection,
        query,
        projection,
      ),
    ).limit(1);
  };

  findAndModify(collection, document) {
    return this._serviceProvider.findAndModify(
      collection.database,
      collection.collection,
      document,
    );
  };

  findOneAndDelete(collection, filter, options) {
    return this._serviceProvider.findOneAndDelete(
      collection.database,
      collection.collection,
      filter,
      options,
    );
  };

  findOneAndReplace(collection, filter, replacement, options) {
    return this._serviceProvider.findOneAndReplace(
      collection.database,
      collection.collection,
      filter,
      replacement,
      options,
    );
  };

  findOneAndUpdate(collection, filter, update, options) {
    return this._serviceProvider.findOneAndUpdate(
      collection.database,
      collection.collection,
      filter,
      update,
      options,
    );
  };

  insert(collection, docs, options) {
    const d = typeof docs === 'array' ? docs : [docs];
    return this._serviceProvider.insertMany(
      collection.database,
      collection.collection,
      d,
      options,
    );
  };

  insertMany(collection, docs, options) {
    return this._serviceProvider.insertMany(
      collection.database,
      collection.collection,
      docs,
      options,
    );
  };

  insertOne(collection, doc, options) {
    return this._serviceProvider.insertOne(
      collection.database,
      collection.collection,
      doc,
      options,
    );
  };

  isCapped(collection) {
    return this._serviceProvider.isCapped(
      collection.database,
      collection.collection,
    );
  };

  remove(collection, query, options) {
    return this._serviceProvider.remove(
      collection.database,
      collection.collection,
      query,
      options,
    );
  };

  save(collection, doc, options) {
    return this._serviceProvider.save(
      collection.database,
      collection.collection,
      doc,
      options,
    );
  };

  replaceOne(collection, filter, replacement, options) {
    return this._serviceProvider.replaceOne(
      collection.collection,
      collection.database,
      filter,
      replacement,
      options,
    );
  };

  update(collection, filter, update, options) {
    if (options.multi) {
      return this._serviceProvider.updateMany(
        collection.collection,
        collection.database,
        filter,
        update,
        options,
      );
    } else {
      return this._serviceProvider.updateOne(
        collection.collection,
        collection.database,
        filter,
        update,
        options,
      );
    }
  };

  updateMany(collection, filter, update, options) {
    return this._serviceProvider.updateMany(
      collection.collection,
      collection.database,
      filter,
      update,
      options,
    );
  };

  updateOne(collection, filter, update, options) {
    return this._serviceProvider.updateOne(
      collection.collection,
      collection.database,
      filter,
      update,
      options,
    )
  };
}

module.exports = Mapper;
