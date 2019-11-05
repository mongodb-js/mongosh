const NOT_IMPLEMENTED = 'is not implemented in the Stitch browser SDK';

/**
 * Encapsulates logic for communicating with a MongoDB instance via
 * Stitch in the browser.
 */
class StitchBrowserTransport {
  /**
   * Instantiate a new Stitch browser transport with a connected stitch
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
  runCommand() {
    return Promise.reject(`StitchBrowserTransport#runCommand ${NOT_IMPLEMENTED}`);
  }
}

module.exports = StitchBrowserTransport;
