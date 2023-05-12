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
function optionsTest(cliOptions: CliOptions): { cs?: string, driver?: Partial<DevtoolsConnectOptions> } {
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
      expect(optionsTest({ password: 'aphextwin', username: 'x' })).to.deep.equal({
        cs: 'mongodb://x:aphextwin@localhost/'
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

  context('when password is provided without username', () => {
    const cliOptions: CliOptions = { password: '1234' };

    it('throws a helpful error', () => {
      expect(() => optionsTest(cliOptions)).to.throw(
        "[COMMON-10001] Invalid connection information: Password specified but no username provided (did you mean '--port' instead of '-p'?)");
    });
  });

  context('when password is provided without username and --port is already specified', () => {
    const cliOptions: CliOptions = { password: '1234', port: '12345' };

    it('throws a helpful error', () => {
      expect(() => optionsTest(cliOptions)).to.throw(
        '[COMMON-10001] Invalid connection information: Password specified but no username provided');
    });
  });

  context('when cli args have oidcRedirectUri', () => {
    const cliOptions: CliOptions = { oidcRedirectUri: 'http://localhost:0/callback' };

    it('maps to oidc redirectURI', () => {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          oidc: {
            redirectURI: 'http://localhost:0/callback'
          }
        }
      });
    });
  });

  context('when cli args have oidcTrustedEndpoint', () => {
    function actual(cs: string) {
      return mapCliToDriver({ oidcTrustedEndpoint: true }, {
        connectionString: cs,
        driverOptions: {},
      }).driverOptions;
    }

    function expected(ALLOWED_HOSTS: string[]) {
      return { authMechanismProperties: { ALLOWED_HOSTS } };
    }

    it('maps to ALLOWED_HOSTS', () => {
      expect(actual('mongodb://localhost/')).to.deep.equal(expected(['localhost']));
      expect(actual('mongodb://localhost:27017/')).to.deep.equal(expected(['localhost']));
      expect(actual('mongodb://localhost:12345/')).to.deep.equal(expected(['localhost']));
      expect(actual('mongodb://localhost:12345,[::1]/')).to.deep.equal(expected(['localhost', '::1']));
      expect(actual('mongodb://localhost,[::1]:999/')).to.deep.equal(expected(['localhost', '::1']));
      expect(actual('mongodb://localhost,bar.foo.net/')).to.deep.equal(expected(['localhost', 'bar.foo.net']));
      expect(actual('mongodb+srv://bar.foo.net/')).to.deep.equal(expected(['*.foo.net']));
      expect(actual('mongodb://127.0.0.1:12345/')).to.deep.equal(expected(['127.0.0.1']));
      expect(actual('mongodb://2130706433:12345/')).to.deep.equal(expected(['2130706433'])); // decimal IPv4
    });
  });

  context('when cli args have oidcFlows', () => {
    it('maps to oidc allowedFlows', () => {
      expect(optionsTest({ oidcFlows: 'a,b,c' })).to.deep.equal({ driver: { oidc: { allowedFlows: ['a', 'b', 'c'] } } });
      expect(optionsTest({ oidcFlows: 'a,,c' })).to.deep.equal({ driver: { oidc: { allowedFlows: ['a', 'c'] } } });
      expect(optionsTest({ oidcFlows: ',' })).to.deep.equal({ driver: { oidc: { allowedFlows: [] } } });
    });
  });

  context('when cli args have browser', () => {
    it('maps to oidc command', () => {
      expect(optionsTest({ browser: '/usr/bin/browser' })).to.deep.equal({
        driver: {
          oidc: {
            openBrowser: {
              command: '/usr/bin/browser'
            }
          }
        }
      });

      expect(optionsTest({ browser: false })).to.deep.equal({
        driver: {
          oidc: {
            openBrowser: false
          }
        }
      });
    });
  });
});
