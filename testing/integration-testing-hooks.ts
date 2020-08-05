const mongodbRunnerBefore = require('mongodb-runner/mocha/before');
const mongodbRunnerAfter = require('mongodb-runner/mocha/after');
const semver = require('semver');
const { MongoClient } = require('mongodb');

export const LOCAL_INSTANCE_PORT = 27018;
export const LOCAL_INSTANCE_HOST = 'localhost';

const envConnectionString = process.env.MONGOSH_TEST_SERVER_URL;
const localConnectionString = `mongodb://${LOCAL_INSTANCE_HOST}:${LOCAL_INSTANCE_PORT}`;
const connectionString = envConnectionString || localConnectionString;

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

let testServerVersion;

async function getServerVersion(connectionString: string) {
  let client;
  try {
    client = await MongoClient.connect(connectionString, {
      useUnifiedTopology: true,
      useNewUrlParser: true
    });

    return (await client.db().admin().serverStatus()).version;
  } finally {
    if (client) {
      client.close();
    }
  }
}

/**
 * Skip tests in the suite if the test server version matches a specific semver
 * condition.
 *
 * describe('...', () => {
 *   ie. skipIfServerVersion('< 4.4')
 * });
 *
 * @export
 * @returns {string} - uri that can be used to connect to the server.
 */
export function skipIfServerVersion(semverCondition) {
  before(async function() {
    testServerVersion = testServerVersion || await getServerVersion(connectionString);
    if (semver.satisfies(testServerVersion, semverCondition)) {
      this.skip();
    }
  });
}
