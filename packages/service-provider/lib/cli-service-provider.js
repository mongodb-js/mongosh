const { NodeTransport } = require('mongosh-transport');

/**
 * Encapsulates logic for the service provider for the mongosh CLI.
 */
class CliServiceProvider {
  /**
   * Create a new CLI service provider from the provided URI.
   *
   * @param {String} uri - The URI.
   */
  async connect(uri) {
    this.nodeTransport = await NodeTransport.fromURI(uri);
  }
  constructor(uri) {
    this.connect(uri);
  }

  aggregate(db, coll, pipeline, options, dbOptions) {
    return this.nodeTransport.aggregate(db, coll, pipeline, options, dbOptions);
  }
  aggregateDb(db, pipeline, options, dbOptions) {
    return this.nodeTransport.aggregateDb(db, pipeline, options, dbOptions);
  }
  bulkWrite(db, coll, requests = {}, options = {}, dbOptions = {}) {
    return this.nodeTransport.bulkWrite(db, coll, requests, options, dbOptions);
  }
  count(db, coll, query, options, collOptions) {
    return this.nodeTransport.count(db, coll, filter, options, collOptions);
  }
  countDocuments(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.countDocuments(db, coll, filter, options, dbOptions);
  }
  deleteMany(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.deleteMany(db, coll, filter, options, dbOptions);
  }
  deleteOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.deleteOne(db, coll, filter, options, dbOptions);
  }
  distinct(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.distinct(db, coll, filter, options, dbOptions);
  }
  estimatedDocumentCount(db, coll, filter, options) {
    return this.nodeTransport.estimatedDocumentCount(db, coll, filter, options);
  }
  find(db, coll, query, options = {}) {
    return this.nodeTransport.find(db, coll, query, options);
  }
  findOneAndDelete(db, coll, filter, options) {
    return this.nodeTransport.findOneAndDelete(db, coll, filter, options);
  }
  findOneAndReplace(db, coll, filter, options) {
    return this.nodeTransport.findOneAndReplace(db, coll, filter, options);
  }
  findOneAndUpdate(db, coll, filter, options) {
    return this.nodeTransport.findOneAndUpdate(db, coll, filter, options);
  }
  insertMany(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.insertMany(db, coll, filter, options, dbOptions);
  }
  insertOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.insertOne(db, coll, filter, options, dbOptions);
  }
  isCapped(db, coll) {
    return this.nodeTransport.isCapped(db, coll);
  }
  remove(db, coll, query, options, dbOptions) {
    return this.nodeTransport.remove(db, coll, query, options, dbOptions);
  }
  save(db, coll, doc, options, dbOptions) {
    return this.nodeTransport.save(db, coll, doc, options, dbOptions);
  }
  replaceOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.replaceOne(db, coll, filter, options, dbOptions);
  }
  runCommand(db, spec, options = {}) {
    return this.nodeTransport.runCommand(db, spec, options);
  }
  updateMany(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.updateMany(db, coll, filter, options, dbOptions);
  }
  updateOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.updateOne(db, coll, filter, options, dbOptions);
  }
}

module.exports = CliServiceProvider;
