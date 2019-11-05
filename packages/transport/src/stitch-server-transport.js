const NOT_IMPLEMENTED = 'is not implemented in the Stitch server SDK';

/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * Stitch in the server.
 */
class StitchServerTransport {
  /**
   * Instantiate a new Stitch server transport with a connected stitch
   * client instance.
   *
   * @param {Client} stitchClient - The Stitch client instance.
   */
  constructor(stitchClient) {
    this.stichClient = stitchClient;
  }

  /**
   * Run a command against the database.
   *
   * @returns {Promise} The promise of command results.
   */
  runCommand(database, spec, options = {}) {
    return Promise.reject(`StitchServerTransport#runCommand ${NOT_IMPLEMENTED}`);
  }
}

module.exports = StitchServerTransport;
