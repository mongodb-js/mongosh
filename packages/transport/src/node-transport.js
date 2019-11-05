const { MongoClient } = require('mongodb');

/**
 * Default driver options we always use.
 */
const DEFAULT_OPTIONS = Object.freeze({
  useNewUrlParser: true,
  useUnifiedTopology: true
});

/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * the Node Driver.
 */
class NodeTransport {
  /**
   * Create a NodeTransport from a URI.
   *
   * @param {String} uri - The URI.
   *
   * @returns {NodeTransport} The Node transport.
   */
  static async fromURI(uri) {
    const mongoClient = new MongoClient(uri, DEFAULT_OPTIONS);
    await mongoClient.connect();
    return new NodeTransport(mongoClient);
  };

  /**
   * Run an aggregation pipeline.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Object} options - The pipeline options.
   *
   * @returns {Promise} The promise of the aggregation cursor.
   */
  aggregate(database, collection, pipeline, options = {}) {
    return this._db(database).collection(collection).
      aggregate(pipeline, options);
  }

  /**
   * Get an exact document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Object} filter - The filter.
   * @param {Object} options - The count options.
   *
   * @returns {Promise} The promise of the count.
   */
  countDocuments(database, collection, filter = {}, options = {}) {
    return this._db(database).collection(collection).
      countDocuments(filter, options);
  }

  /**
   * Instantiate a new Node transport with the Node driver's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   */
  constructor(mongoClient) {
    this.mongoClient = mongoClient;
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
    return this._db(database).command(spec, options);
  }

  /**
   * Get the DB object from the client.
   *
   * @param {String} name - The database name.
   *
   * @returns {Db} The database.
   */
  _db(name) {
    return this.mongoClient.db(name);
  }
};

module.exports = NodeTransport;
