const mongodbRunnerBefore = require('mongodb-runner/mocha/before');
const mongodbRunnerAfter = require('mongodb-runner/mocha/after');

export const LOCAL_INSTANCE_PORT = 27028;
export const LOCAL_INSTANCE_HOST = 'localhost';

/**
 * Starts a local server unless the `MONGOSH_TEST_SERVER_URL`
 * environment variable is set.
 *
 * It returns the uri that can be used to connect to the server.
 *
 * If env.MONGOSH_TEST_SERVER_URL is set it assumes a server
 * is already running on that uri and returns the env variable
 * as connection string.
 *
 * @export
 * @returns {string} - uri that can be used to connect to the server.
 */
export function startTestServer(): string {
  const envConnectionString = process.env.MONGOSH_TEST_SERVER_URL;
  const localConnectionString = `mongodb://${LOCAL_INSTANCE_HOST}:${LOCAL_INSTANCE_PORT}`;
  const connectionString = envConnectionString || localConnectionString;

  if (!envConnectionString) {
    console.info(
      'MONGOSH_TEST_SERVER_URL not provided. A local server will be started on',
      localConnectionString
    );

    before(function(done: Function) {
      try {
        mongodbRunnerBefore({
          port: LOCAL_INSTANCE_PORT,
          timeout: this.timeout()
        }).call(this, done);
      } catch (e) {
        done(e);
      }
    });

    after(function(done: Function) {
      try {
        mongodbRunnerAfter({
          port: LOCAL_INSTANCE_PORT
        }).call(this, done);
      } catch (e) {
        done(e);
      }
    });
  }

  return connectionString;
}
