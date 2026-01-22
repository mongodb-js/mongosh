import { expect } from 'chai';
import { spawnSync } from 'child_process';
import { startTestShell } from './test-shell-context';

function assertEnvVariable(variableName: string): string {
  if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
    return '';
  }
  const value = process.env[variableName];
  if (!value) {
    if (process.env.IS_CI) {
      throw new Error(
        `Expected environment variable but was not set: ${variableName}`
      );
    } else {
      console.error(
        `Expected environment variable but was not set: ${variableName}`
      );
      return '';
    }
  }
  return value;
}

const ATLAS_CLUSTER_HOST = assertEnvVariable('AWS_AUTH_ATLAS_CLUSTER_HOST');
const AWS_IAM_USER_ARN = assertEnvVariable('AWS_AUTH_IAM_USER_ARN');
const AWS_ACCESS_KEY_ID = assertEnvVariable('AWS_AUTH_IAM_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = assertEnvVariable(
  'AWS_AUTH_IAM_SECRET_ACCESS_KEY'
);
const AWS_IAM_TEMP_ROLE_ARN = assertEnvVariable('AWS_AUTH_IAM_TEMP_ROLE_ARN');

function generateIamSessionToken(): {
  key: string;
  secret: string;
  token: string;
} {
  const result = spawnSync(
    'aws',
    [
      'sts',
      'assume-role',
      '--role-arn',
      AWS_IAM_TEMP_ROLE_ARN,
      '--role-session-name',
      'MONGODB-AWS-AUTH-TEST',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY,
      },
    }
  );
  if (result.status !== 0) {
    console.error('Failed to run aws sts assume-role', result);
    throw new Error('Failed to run aws sts assume-role');
  }

  const parsedToken = JSON.parse(result.stdout);
  const key = parsedToken?.Credentials?.AccessKeyId;
  const secret = parsedToken?.Credentials?.SecretAccessKey;
  const token = parsedToken?.Credentials?.SessionToken;
  if (!key || !secret || !token) {
    throw new Error(
      'Could not determine key, token, or secret from sts assume-role output'
    );
  }
  return {
    key,
    secret,
    token,
  };
}

function getConnectionString(username?: string, password?: string): string {
  let auth = '';
  if (username && password) {
    auth = `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  return `mongodb+srv://${auth}${ATLAS_CLUSTER_HOST}/?authSource=%24external&authMechanism=MONGODB-AWS`;
}

describe('e2e AWS AUTH', function () {
  // AWS auth tests can take longer than the default timeout in CI
  // DNS resolution for many hosts in particular can be time-intensive in some
  // CI environments
  this.timeout(80_000);
  const initialWaitForPromptTimeoutOptions = { timeout: 60_000 };
  let expectedAssumedRole: string;

  before(function () {
    let awsCliFound = false;
    try {
      const result = spawnSync('aws', ['--version'], {
        encoding: 'utf8',
      });
      if (result.status === 0) {
        awsCliFound = true;
      }
    } catch (e: any) {
      // pass
    }
    if (!awsCliFound) {
      console.error('AWS CLI is not available - skipping AWS AUTH tests...');
      return this.skip();
    }

    if (!ATLAS_CLUSTER_HOST) {
      console.error(
        'Could not get ATLAS_CLUSTER_HOST - skipping AWS AUTH tests...'
      );
      return this.skip();
    }

    expectedAssumedRole = `${AWS_IAM_TEMP_ROLE_ARN.replace(
      ':role/',
      ':assumed-role/'
    ).replace('arn:aws:iam::', 'arn:aws:sts::')}/*`;
  });

  context('without environment variables being present', function () {
    context('specifying explicit parameters', function () {
      it('connects with access key and secret', async function () {
        const shell = startTestShell(this, {
          args: [
            getConnectionString(),
            '--username',
            AWS_ACCESS_KEY_ID,
            '--password',
            AWS_SECRET_ACCESS_KEY,
          ],
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${AWS_IAM_USER_ARN}'`);
      });

      it('connects with access key, secret, and session token for IAM role', async function () {
        const tokenDetails = generateIamSessionToken();
        const shell = startTestShell(this, {
          args: [
            getConnectionString(),
            '--username',
            tokenDetails.key,
            '--password',
            tokenDetails.secret,
            '--awsIamSessionToken',
            tokenDetails.token,
          ],
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${expectedAssumedRole}'`);
      });
    });

    context('specifying connection string parameters', function () {
      it('connects with access key and secret', async function () {
        const shell = startTestShell(this, {
          args: [getConnectionString(AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)],
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${AWS_IAM_USER_ARN}'`);
      });

      it('connects with access key, secret, and session token for IAM role', async function () {
        const tokenDetails = generateIamSessionToken();
        const shell = startTestShell(this, {
          args: [
            `${getConnectionString(
              tokenDetails.key,
              tokenDetails.secret
            )}&authMechanismProperties=AWS_SESSION_TOKEN:${encodeURIComponent(
              tokenDetails.token
            )}`,
          ],
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${expectedAssumedRole}'`);
      });
    });
  });

  context('with AWS environment variables', function () {
    context('without any other parameters', function () {
      it('connects for the IAM user', async function () {
        const shell = startTestShell(this, {
          args: [getConnectionString()],
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY,
          },
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${AWS_IAM_USER_ARN}'`);
      });

      it('connects for the IAM role session', async function () {
        const tokenDetails = generateIamSessionToken();
        const shell = startTestShell(this, {
          args: [getConnectionString()],
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: tokenDetails.key,
            AWS_SECRET_ACCESS_KEY: tokenDetails.secret,
            AWS_SESSION_TOKEN: tokenDetails.token,
          },
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${expectedAssumedRole}'`);
      });
    });

    context('with invalid environment but valid parameters', function () {
      it('connects for the IAM user', async function () {
        const shell = startTestShell(this, {
          args: [
            getConnectionString(),
            '--username',
            AWS_ACCESS_KEY_ID,
            '--password',
            AWS_SECRET_ACCESS_KEY,
          ],
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: 'invalid',
            AWS_SECRET_ACCESS_KEY: 'invalid',
          },
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${AWS_IAM_USER_ARN}'`);
      });

      it('connects for the IAM role session', async function () {
        const tokenDetails = generateIamSessionToken();
        const shell = startTestShell(this, {
          args: [
            getConnectionString(),
            '--username',
            tokenDetails.key,
            '--password',
            tokenDetails.secret,
            '--awsIamSessionToken',
            tokenDetails.token,
          ],
          env: {
            ...process.env,
            AWS_ACCESS_KEY_ID: 'invalid',
            AWS_SECRET_ACCESS_KEY: 'invalid',
            AWS_SESSION_TOKEN: 'invalid',
          },
        });
        const result = await shell.waitForPromptOrExit(
          initialWaitForPromptTimeoutOptions
        );
        expect(result.state).to.equal('prompt');

        const connectionStatus = await shell.executeLine(
          'db.runCommand({ connectionStatus: 1 })'
        );
        expect(connectionStatus).to.contain(`user: '${expectedAssumedRole}'`);
      });
    });
  });
});
