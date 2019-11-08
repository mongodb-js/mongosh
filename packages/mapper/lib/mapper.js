const { Database, Cursor } = require('mongosh-shell-api');

class Mapper {
  constructor(serviceProvider) {
    this._serviceProvider = serviceProvider;
    this._translateOptions = {
      justOne: 'single',
      writeConcern: 'w',
      collation: false // TODO: handle collation
    };

    this.setCtx = (ctx) => {
      this._ctx = ctx;
      this._ctx.db = new Database(this, 'test');
    };

    /**
     * RunCommand
     * @param database {Database} - reference to the database object this method is called from.
     * @param cmd {Object} - command spec
     * @return {*} TODO
     */
    this.runCommand = (database, cmd) => {
      return this._serviceProvider.runCommand(database.database, cmd);
    };

    this.use = (_, db) => {
      this._ctx.db = new Database(this, db);
      return `switched to db ${db}`;
    };

    /**
     * Find command
     *
     * @param collection {Collection} - reference to the collection object this method is called from.
     * @param query {Object} - query spec
     * @param projection {Object} - projection spec
     *
     * @return {ShellApi.Cursor} - newly instantiated cursor object
     */
    this.find = (collection, query, projection) => {
      const options = {};
      if (projection) {
        options.projection = projection;
      }
      return new Cursor(
        this,
        this._serviceProvider.find(
          collection.database,
          collection.collection,
          query ? query : {},
          options
        )
      );
    };

    /**
     * Aggregate command
     *
     * @param collection {Collection} - reference to the collection object this method is called from.
     * @param pipeline {Array} - pipeline array
     * @param options {Object} - options
     *    explain {bool}
     *    allowDiskUse {bool}
     *    cursor {Object {
     *        batchSize: n
     *    }
     *    maxTimeMS {integer}
     *    bypassDocumentValidation {bool}
     *    readConcern {Object {
     *        level: {local/available/majority/linearizable}
     *    }}
     *    collation {Object {
     *        locale: {str},
     *        caseLevel: {bool},
     *        caseFirst: {str},
     *        strength: {int},
     *        numericOrdering: {bool},
     *        alternative: {str},
     *        maxVariable: {str},
     *        backwards: {bool}
     *    }}
     *
     * @return {ShellApi.Cursor} - newly instantiated cursor object
     */
    this.aggregate = (collection, pipeline, options) => {
      return new Cursor(
        this,
        this._serviceProvider.aggregate(
          collection.database,
          collection.collection,
          pipeline,
          options
        )
      );
    };

    /**
     * Bulk write command
     *
     * @param collection {Collection} - reference to the collection object this method is called from.
     * @param operations {Object} - the bulk write operations
     * @param writeConcern {Object} - write concern object
     * @param ordered {bool} - if ordered
     *
     * @return {boolean} - A boolean acknowledged as true if the operation ran with write concern or false if write concern was disabled.
     */
    this.bulkWrite = (collection, operations, writeConcern, ordered) => {
      const options = {};
      if (writeConcern) options.w = writeConcern;
      if (ordered) options.ordered = ordered;
      this._serviceProvider.bulkWrite(
        collection.database,
        collection.collection,
        operations,
        options
      )
    };

    /**
     * Count
     *
     * @param collection {Collection} - reference to the collection object this method is called from.
     * @param query {Object} - query spec
     * @param options {Object} - options
     */
    this.countDocuments = (collection, query, options) => {
      return this._serviceProvider.countDocuments(
        collection.database,
        collection.collection,
        query,
        options
      )
    };

    /**
     * Count
     *
     * @param collection {Collection} - reference to the collection object this method is called from.
     * @param query {Object} - query spec
     * @param options {Object} - options
     */
    this.count = (collection, query, options) => {
      return this._serviceProvider.countDocuments(
        collection.database,
        collection.collection,
        query,
        options
      )
    };

    this.deleteMany = (collection, filter, options) => {
      return this._serviceProvider.deleteMany(
        collection.database,
        collection.collection,
        filter,
        options
      )
    };

    this.deleteOne = (collection, filter, options) => {
      return this._serviceProvider.deleteOne(
        collection.database,
        collection.collection,
        filter,
        options
      )
    };

    this.distinct = (collection, field, query, options) => {
      return this._serviceProvider.distinct(
        collection.database,
        collection.collection,
        field,
        query,
        options
      );
    };

    this.estimatedDocumentCount = (collection, options) => {
      return this._serviceProvider.estimatedDocumentCount(
        collection.database,
        collection.collection,
        options
      );
    };

    this.findOneAndDelete = (collection, filter, options) => {
      return this._serviceProvider.findOneAndDelete(
        collection.database,
        collection.collection,
        filter,
        options
      );
    };

    this.findOneAndReplace = (collection, filter, replacement, options) => {
      return this._serviceProvider(
        collection.database,
        collection.collection,
        filter,
        replacement,
        options
      );
    };

    this.findOneAndUpdate = (collection, filter, update, options) => {
      return this._serviceProvider(
        collection.database,
        collection.collection,
        filter,
        update,
        options
      );
    };

    this.insertMany = (collection, docs, options) => {
      return this._serviceProvider(
        collection.database,
        collection.collection,
        docs,
        options
      );
    };

    this.insertOne = (collection, doc, options) => {
      return this._serviceProvider(
        collection.database,
        collection.collection,
        doc,
        options
      );
    };

    this.isCapped = (collection) => {
      return this._serviceProvider(
        collection.database,
        collection.collection
      );
    };

    this.remove = (collection, query, opt) => {
      let options = {};
      if (typeof opt === 'boolean') {
        opt = { justOne: opt };
      }
      Object.keys(opt).filter((k) => (
        this._translateOptions[k]
      )).forEach((k) => (
        options[this._translateOptions[k]] = opt[k]
      ));
      return this._serviceProvider.remove(
        collection.database,
        collection.collection,
        options
      );
    };

    /**
     * TODO: fix this
     */
    this.save = (collection, doc, opt) => {
      let options = {};
      Object.keys(opt).filter((k) => (
        this._translateOptions[k]
      )).forEach((k) => (
        options[this._translateOptions[k]] = opt[k]
      ));
      return this._serviceProvider.save(
        collection.database,
        collection.collection,
        doc,
        options
      );
    };

    this.replaceOne = (collection, filter, replacement, options) => {
      return this._serviceProvider(
        collection.collection,
        collection.database,
        filter,
        replacement,
        options
      );
    };

    this.updateMany = (collection, filter, update, options) => {
      return this._serviceProvider(
        collection.collection,
        collection.database,
        filter,
        update,
        options
      );
    };

    this.updateOne = (collection, filter, update, options) => {
      return this._serviceProvider(
        collection.collection,
        collection.database,
        filter,
        update,
        options
      )
    };
  }

}

module.exports = Mapper;
