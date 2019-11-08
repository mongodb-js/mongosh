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

  /**
   * Run a command against the database.
   *
   * @param {String} database - The database name.
   * @param {Object} spec - The command specification.
   * @param {Object} options - The database options.
   *
   * @returns {Promise} The promise of command results.
   */
  runCommand(database, spec, options = {}) {
    return this.nodeTransport.runCommand(database, spec, options);
  }

  find(database, collection, query, options = {}) {
    return this.nodeTransport.find(database, collection, query, options);
  }
  aggregate(database, collection, pipeline, options) {
    return this.nodeTransport.aggregate(database, collection, pipeline, options);
  }
  bulkWrite(database, collection, requests = {}, options = {}) {
    return this.nodeTransport.bulkWrite(database, collection, requests, options);
  }
  countDocuments(database, collection, filter, options) {
    return this.nodeTransport.countDocuments(database, collection, filter, options);
  }
  deleteMany(database, collection, filter, options) {
    return this.nodeTransport.deleteMany(database, collection, filter, options);
  }
  deleteOne(database, collection, filter, options) {
    return this.nodeTransport.deleteOne(database, collection, filter, options);
  }
  distinct(database, collection, filter, options) {
    return this.nodeTransport.distinct(database, collection, filter, options);
  }
  estimatedDocumentCount(database, collection, filter, options) {
    return this.nodeTransport.estimatedDocumentCount(database, collection, filter, options);
  }
  findOneAndDelete(database, collection, filter, options) {
    return this.nodeTransport.findOneAndDelete(database, collection, filter, options);
  }
  findOneAndReplace(database, collection, filter, options) {
    return this.nodeTransport.findOneAndReplace(database, collection, filter, options);
  }
  findOneAndUpdate(database, collection, filter, options) {
    return this.nodeTransport.findOneAndUpdate(database, collection, filter, options);
  }
  insertMany(database, collection, filter, options) {
    return this.nodeTransport.insertMany(database, collection, filter, options);
  }
  insertOne(database, collection, filter, options) {
    return this.nodeTransport.insertOne(database, collection, filter, options);
  }
  replaceOne(database, collection, filter, options) {
    return this.nodeTransport.replaceOne(database, collection, filter, options);
  }
  updateMany(database, collection, filter, options) {
    return this.nodeTransport.updateMany(database, collection, filter, options);
  }
  updateOne(database, collection, filter, options) {
    return this.nodeTransport.updateOne(database, collection, filter, options);
  }
}

module.exports = CliServiceProvider;
