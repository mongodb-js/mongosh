const { NodeTransport } = require('mongodbsh-transport');

/**
 * Encapsulates logic for the service provider for Compass.
 */
class CompassServiceProvider {
  /**
   * Create a new Compass service provider from the provided connected
   * MongoClient.
   *
   * @param {MongoClient} mongoClient - The MongoClient.
   */
  constructor(mongoClient) {
    this.nodeTransport = new NodeTransport(mongoClient);
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
}

module.exports = CompassServiceProvider;
