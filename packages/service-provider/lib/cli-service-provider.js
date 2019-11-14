const NodeTransport = require('mongosh-transport-server');

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
}

module.exports = CliServiceProvider;
