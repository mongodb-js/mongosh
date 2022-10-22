import { CliOptions, ConnectionInfo } from './';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import { mapCliToDriver } from './arg-mapper';
import { DevtoolsConnectOptions } from '@mongodb-js/devtools-connect';
chai.use(sinonChai);

const INIT_STATE: Readonly<ConnectionInfo> = {
  driverOptions: {},
  connectionString: 'mongodb://localhost'
};

// Helper for reducing test boilerplate
function optionsTest(cliOptions: CliOptions): { cs?: string, driver?: DevtoolsConnectOptions } {
  const result = mapCliToDriver(cliOptions, INIT_STATE);
  if (Object.keys(result.driverOptions).length === 0) {
    return { cs: result.connectionString.toString() };
  }
  if (result.connectionString === INIT_STATE.connectionString) {
    return { driver: result.driverOptions };
  }
  return { cs: result.connectionString, driver: result.driverOptions };
}

describe('arg-mapper.mapCliToDriver', () => {
  context('when cli args have authenticationDatabase', () => {
    const cliOptions: CliOptions = { authenticationDatabase: 'authDb' };

    it('maps to authSource', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authSource=authDb'
      });
    });
  });

  context('when cli args have authenticationMechanism', () => {
    const cliOptions: CliOptions = { authenticationMechanism: 'SCRAM-SHA-1' };

    it('maps to authMechanism', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanism=SCRAM-SHA-1'
      });
    });
  });

  context('when cli args have quiet', () => {
    const cliOptions: CliOptions = { quiet: true };

    it('maps to loggerLevel', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: { loggerLevel: 'error' }
      });
    });
  });

  context('when cli args have verbose', () => {
    const cliOptions: CliOptions = { verbose: true };

    it('maps to loggerLevel', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: { loggerLevel: 'debug' }
      });
    });
  });

  context('when cli args have username', () => {
    it('maps to auth object', () => {
      expect(optionsTest({ username: 'richard' })).to.deep.equal({
        cs: 'mongodb://richard@localhost/'
      });

      expect(optionsTest({ username: '大熊猫' })).to.deep.equal({
        cs: 'mongodb://%E5%A4%A7%E7%86%8A%E7%8C%AB@localhost/'
      });
    });
  });

  context('when cli args have password', () => {
    it('maps to auth object', () => {
      expect(optionsTest({ password: 'aphextwin' })).to.deep.equal({
        cs: 'mongodb://:aphextwin@localhost/'
      });
    });
  });

  context('when cli args have username and password', () => {
    it('maps to auth object', () => {
      expect(optionsTest({ username: 'richard', password: 'aphextwin' })).to.deep.equal({
        cs: 'mongodb://richard:aphextwin@localhost/'
      });

      expect(optionsTest({ username: '大熊猫', password: 'C;Ib86n5b8{AnExew[TU%XZy,)E6G!dk' })).to.deep.equal({
        cs: 'mongodb://%E5%A4%A7%E7%86%8A%E7%8C%AB:C%3BIb86n5b8%7BAnExew%5BTU%25XZy%2C)E6G!dk@localhost/'
      });
    });
  });

  context('when cli args have retryWrites', () => {
    const cliOptions: CliOptions = { retryWrites: true };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?retryWrites=true'
      });
    });
  });

  context('when cli args have retryWrites set to false', () => {
    const cliOptions: CliOptions = { retryWrites: false };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?retryWrites=false'
      });
    });
  });

  context('when cli args have tls', () => {
    const cliOptions: CliOptions = { tls: true };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tls=true'
      });
    });
  });

  context('when cli args have tlsAllowInvalidCertificates', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidCertificates: true };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsAllowInvalidCertificates=true'
      });
    });
  });

  context('when cli args have tlsAllowInvalidHostnames', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidHostnames: true };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsAllowInvalidHostnames=true'
      });
    });
  });

  context('when cli args have tlsCAFile', () => {
    const cliOptions: CliOptions = { tlsCAFile: 'ca' };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsCAFile=ca'
      });
    });
  });

  context('when cli args have tlsCRLFile', () => {
    const cliOptions: CliOptions = { tlsCRLFile: 'key' };

    it('maps to sslCRL', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?sslCRL=key'
      });
    });
  });

  context('when cli args have tlsCertificateKeyFile', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFile: 'key' };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsCertificateKeyFile=key'
      });
    });
  });

  context('when cli args have tlsCertificateKeyFilePassword', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFilePassword: 'pw' };

    it('maps the same argument', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsCertificateKeyFilePassword=pw'
      });
    });
  });

  context('when the cli args have awsAccessKeyId', () => {
    const cliOptions: CliOptions = { awsAccessKeyId: 'awskey' };

    it('maps to autoEncryption', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            kmsProviders: {
              aws: {
                accessKeyId: 'awskey'
              }
            }
          },
        }
      });
    });
  });

  context('when the cli args have awsSecretAccessKey', () => {
    const cliOptions: CliOptions = { awsSecretAccessKey: 'secretkey' };

    it('maps to autoEncryption', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            kmsProviders: {
              aws: {
                secretAccessKey: 'secretkey'
              }
            }
          },
        }
      });
    });
  });

  context('when the cli args have awsIamSessionToken', () => {
    const cliOptions: CliOptions = { awsIamSessionToken: 'token' };

    it('maps to authMechanismProperties.AWS_SESSION_TOKEN', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanismProperties=AWS_SESSION_TOKEN%3Atoken'
      });
    });
  });

  context('when the cli args have gssapiServiceName', () => {
    const cliOptions: CliOptions = { gssapiServiceName: 'alternate' };

    it('maps to authMechanismProperties.SERVICE_NAME', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanismProperties=SERVICE_NAME%3Aalternate'
      });
    });
  });

  context('when the cli args have sspiRealmOverride', () => {
    const cliOptions: CliOptions = { sspiRealmOverride: 'REALM.COM' };

    it('maps to authMechanismProperties.SERVICE_REALM', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanismProperties=SERVICE_REALM%3AREALM.COM'
      });
    });
  });

  context('when the cli args have sspiHostnameCanonicalization', () => {
    context('with a value of none', () => {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'none' };

      it('maps to to authMechanismProperties.CANONICALIZE_HOST_NAME', () => {
        expect(optionsTest(cliOptions)).to.deep.equal({
          cs: 'mongodb://localhost/?authMechanismProperties=CANONICALIZE_HOST_NAME%3Anone'
        });
      });
    });

    context('with a value of forward', () => {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'forward' };

      it('maps to to authMechanismProperties.CANONICALIZE_HOST_NAME', () => {
        expect(optionsTest(cliOptions)).to.deep.equal({
          cs: 'mongodb://localhost/?authMechanismProperties=CANONICALIZE_HOST_NAME%3Aforward'
        });
      });
    });

    context('with a value of true', () => {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'true' };

      it('maps to to authMechanismProperties.CANONICALIZE_HOST_NAME', () => {
        expect(optionsTest(cliOptions)).to.deep.equal({
          cs: 'mongodb://localhost/?authMechanismProperties=CANONICALIZE_HOST_NAME%3Atrue'
        });
      });
    });
  });

  context('when the cli args have keyVaultNamespace', () => {
    const cliOptions: CliOptions = { keyVaultNamespace: 'db.datakeys' };

    it('maps to autoEncryption', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            keyVaultNamespace: 'db.datakeys'
          }
        }
      });
    });
  });

  context('when the cli args have all FLE options', () => {
    const cliOptions: CliOptions = {
      keyVaultNamespace: 'db.datakeys',
      awsSecretAccessKey: 'secretkey',
      awsAccessKeyId: 'awskey'
    };

    it('maps to autoEncryption', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            keyVaultNamespace: 'db.datakeys',
            kmsProviders: {
              aws: {
                accessKeyId: 'awskey',
                secretAccessKey: 'secretkey'
              }
            }
          }
        }
      });
    });
  });

  context('when the cli args have all server API options options', () => {
    const cliOptions: CliOptions = {
      apiStrict: true,
      apiDeprecationErrors: true,
      apiVersion: '1'
    };

    it('maps to serverApi', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          serverApi: {
            strict: true,
            deprecationErrors: true,
            version: '1'
          }
        }
      });
    });
  });
});
