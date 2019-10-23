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
    const mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    return new NodeTransport(mongoClient);
  };

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
   */
  _db(name) {
    return this.mongoClient.db(name);
  }
};

module.exports = NodeTransport;
