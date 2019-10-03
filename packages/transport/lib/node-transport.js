/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * the Node Driver.
 */
class NodeTransport {
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
   *
   * @returns {Promise} The promise of command results.
   */
  runCommand(database, spec) {

  }
};

module.exports = NodeTransport;
