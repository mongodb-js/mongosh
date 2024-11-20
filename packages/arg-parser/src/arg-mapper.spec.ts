import type { CliOptions, ConnectionInfo } from './';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import { mapCliToDriver } from './arg-mapper';
import type { DevtoolsConnectOptions } from '@mongodb-js/devtools-connect';
chai.use(sinonChai);

const INIT_STATE: Readonly<ConnectionInfo> = {
  driverOptions: {},
  connectionString: 'mongodb://localhost',
};

// Helper for reducing test boilerplate
function optionsTest(cliOptions: CliOptions): {
  cs?: string;
  driver?: Partial<DevtoolsConnectOptions>;
} {
  const result = mapCliToDriver(cliOptions, INIT_STATE);
  if (Object.keys(result.driverOptions).length === 0) {
    return { cs: result.connectionString.toString() };
  }
  if (result.connectionString === INIT_STATE.connectionString) {
    return { driver: result.driverOptions };
  }
  return { cs: result.connectionString, driver: result.driverOptions };
}

describe('arg-mapper.mapCliToDriver', function () {
  context('when cli args have authenticationDatabase', function () {
    const cliOptions: CliOptions = { authenticationDatabase: 'authDb' };

    it('maps to authSource', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authSource=authDb',
      });
    });
  });

  context('when cli args have authenticationMechanism', function () {
    const cliOptions: CliOptions = { authenticationMechanism: 'SCRAM-SHA-1' };

    it('maps to authMechanism', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanism=SCRAM-SHA-1',
      });
    });
  });

  context('when cli args have username', function () {
    it('maps to auth object', function () {
      expect(optionsTest({ username: 'richard' })).to.deep.equal({
        cs: 'mongodb://richard@localhost/',
      });

      expect(optionsTest({ username: '大熊猫' })).to.deep.equal({
        cs: 'mongodb://%E5%A4%A7%E7%86%8A%E7%8C%AB@localhost/',
      });
    });
  });

  context('when cli args have password', function () {
    it('maps to auth object', function () {
      expect(
        optionsTest({ password: 'aphextwin', username: 'x' })
      ).to.deep.equal({
        cs: 'mongodb://x:aphextwin@localhost/',
      });
    });
  });

  context('when cli args have username and password', function () {
    it('maps to auth object', function () {
      expect(
        optionsTest({ username: 'richard', password: 'aphextwin' })
      ).to.deep.equal({
        cs: 'mongodb://richard:aphextwin@localhost/',
      });

      expect(
        optionsTest({
          username: '大熊猫',
          password: 'C;Ib86n5b8{AnExew[TU%XZy,)E6G!dk',
        })
      ).to.deep.equal({
        cs: 'mongodb://%E5%A4%A7%E7%86%8A%E7%8C%AB:C%3BIb86n5b8%7BAnExew%5BTU%25XZy%2C)E6G!dk@localhost/',
      });
    });
  });

  context('when cli args have retryWrites', function () {
    const cliOptions: CliOptions = { retryWrites: true };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?retryWrites=true',
      });
    });
  });

  context('when cli args have retryWrites set to false', function () {
    const cliOptions: CliOptions = { retryWrites: false };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?retryWrites=false',
      });
    });
  });

  context('when cli args have tls', function () {
    const cliOptions: CliOptions = { tls: true };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tls=true',
      });
    });
  });

  context('when cli args have tlsAllowInvalidCertificates', function () {
    const cliOptions: CliOptions = { tlsAllowInvalidCertificates: true };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsAllowInvalidCertificates=true',
      });
    });
  });

  context('when cli args have tlsAllowInvalidHostnames', function () {
    const cliOptions: CliOptions = { tlsAllowInvalidHostnames: true };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsAllowInvalidHostnames=true',
      });
    });
  });

  context('when cli args have tlsCAFile', function () {
    const cliOptions: CliOptions = { tlsCAFile: 'ca' };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsCAFile=ca',
      });
    });
  });

  context('when cli args have tlsCRLFile', function () {
    const cliOptions: CliOptions = { tlsCRLFile: 'key' };

    it('maps to tlsCRLFile', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsCRLFile=key',
      });
    });
  });

  context('when cli args have tlsCertificateKeyFile', function () {
    const cliOptions: CliOptions = { tlsCertificateKeyFile: 'key' };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsCertificateKeyFile=key',
      });
    });
  });

  context('when cli args have tlsCertificateKeyFilePassword', function () {
    const cliOptions: CliOptions = { tlsCertificateKeyFilePassword: 'pw' };

    it('maps the same argument', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?tlsCertificateKeyFilePassword=pw',
      });
    });
  });

  context('when the cli args have awsAccessKeyId', function () {
    const cliOptions: CliOptions = { awsAccessKeyId: 'awskey' };

    it('maps to autoEncryption', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            kmsProviders: {
              aws: {
                accessKeyId: 'awskey',
              },
            },
          },
        },
      });
    });
  });

  context('when the cli args have awsSecretAccessKey', function () {
    const cliOptions: CliOptions = { awsSecretAccessKey: 'secretkey' };

    it('maps to autoEncryption', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            kmsProviders: {
              aws: {
                secretAccessKey: 'secretkey',
              },
            },
          },
        },
      });
    });
  });

  context('when the cli args have awsIamSessionToken', function () {
    const cliOptions: CliOptions = { awsIamSessionToken: 'token' };

    it('maps to authMechanismProperties.AWS_SESSION_TOKEN', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanismProperties=AWS_SESSION_TOKEN%3Atoken',
      });
    });
  });

  context('when the cli args have gssapiServiceName', function () {
    const cliOptions: CliOptions = { gssapiServiceName: 'alternate' };

    it('maps to authMechanismProperties.SERVICE_NAME', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanismProperties=SERVICE_NAME%3Aalternate',
      });
    });
  });

  context('when the cli args have sspiRealmOverride', function () {
    const cliOptions: CliOptions = { sspiRealmOverride: 'REALM.COM' };

    it('maps to authMechanismProperties.SERVICE_REALM', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        cs: 'mongodb://localhost/?authMechanismProperties=SERVICE_REALM%3AREALM.COM',
      });
    });
  });

  context('when the cli args have sspiHostnameCanonicalization', function () {
    context('with a value of none', function () {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'none' };

      it('maps to to authMechanismProperties.CANONICALIZE_HOST_NAME', function () {
        expect(optionsTest(cliOptions)).to.deep.equal({
          cs: 'mongodb://localhost/?authMechanismProperties=CANONICALIZE_HOST_NAME%3Anone',
        });
      });
    });

    context('with a value of forward', function () {
      const cliOptions: CliOptions = {
        sspiHostnameCanonicalization: 'forward',
      };

      it('maps to to authMechanismProperties.CANONICALIZE_HOST_NAME', function () {
        expect(optionsTest(cliOptions)).to.deep.equal({
          cs: 'mongodb://localhost/?authMechanismProperties=CANONICALIZE_HOST_NAME%3Aforward',
        });
      });
    });

    context('with a value of true', function () {
      const cliOptions: CliOptions = { sspiHostnameCanonicalization: 'true' };

      it('maps to to authMechanismProperties.CANONICALIZE_HOST_NAME', function () {
        expect(optionsTest(cliOptions)).to.deep.equal({
          cs: 'mongodb://localhost/?authMechanismProperties=CANONICALIZE_HOST_NAME%3Atrue',
        });
      });
    });
  });

  context('when the cli args have keyVaultNamespace', function () {
    const cliOptions: CliOptions = { keyVaultNamespace: 'db.datakeys' };

    it('maps to autoEncryption', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            keyVaultNamespace: 'db.datakeys',
          },
        },
      });
    });
  });

  context('when the cli args have all FLE options', function () {
    const cliOptions: CliOptions = {
      keyVaultNamespace: 'db.datakeys',
      awsSecretAccessKey: 'secretkey',
      awsAccessKeyId: 'awskey',
    };

    it('maps to autoEncryption', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          autoEncryption: {
            keyVaultNamespace: 'db.datakeys',
            kmsProviders: {
              aws: {
                accessKeyId: 'awskey',
                secretAccessKey: 'secretkey',
              },
            },
          },
        },
      });
    });
  });

  context('when the cli args have all server API options options', function () {
    const cliOptions: CliOptions = {
      apiStrict: true,
      apiDeprecationErrors: true,
      apiVersion: '1',
    };

    it('maps to serverApi', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          serverApi: {
            strict: true,
            deprecationErrors: true,
            version: '1',
          },
        },
      });
    });
  });

  context('when password is provided without username', function () {
    const cliOptions: CliOptions = { password: '1234' };

    it('throws a helpful error', function () {
      expect(() => optionsTest(cliOptions)).to.throw(
        "[COMMON-10001] Invalid connection information: Password specified but no username provided (did you mean '--port' instead of '-p'?)"
      );
    });
  });

  context(
    'when password is provided without username and --port is already specified',
    function () {
      const cliOptions: CliOptions = { password: '1234', port: '12345' };

      it('throws a helpful error', function () {
        expect(() => optionsTest(cliOptions)).to.throw(
          '[COMMON-10001] Invalid connection information: Password specified but no username provided'
        );
      });
    }
  );

  context('when cli args have oidcRedirectUri', function () {
    const cliOptions: CliOptions = {
      oidcRedirectUri: 'http://localhost:0/callback',
    };

    it('maps to oidc redirectURI', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          oidc: {
            redirectURI: 'http://localhost:0/callback',
          },
        },
      });
    });
  });

  context('when cli args have oidcIdTokenAsAccessToken', function () {
    const cliOptions: CliOptions = {
      oidcIdTokenAsAccessToken: true,
    };

    it('maps to oidc passIdTokenAsAccessToken', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          oidc: {
            passIdTokenAsAccessToken: true,
          },
        },
      });
    });
  });

  context('when cli args have oidcTrustedEndpoint', function () {
    function actual(cs: string) {
      return mapCliToDriver(
        { oidcTrustedEndpoint: true },
        {
          connectionString: cs,
          driverOptions: {},
        }
      ).driverOptions;
    }

    function expected(ALLOWED_HOSTS: string[]) {
      return { authMechanismProperties: { ALLOWED_HOSTS } };
    }

    it('maps to ALLOWED_HOSTS', function () {
      expect(actual('mongodb://localhost/')).to.deep.equal(
        expected(['localhost'])
      );
      expect(actual('mongodb://localhost:27017/')).to.deep.equal(
        expected(['localhost'])
      );
      expect(actual('mongodb://localhost:12345/')).to.deep.equal(
        expected(['localhost'])
      );
      expect(actual('mongodb://localhost:12345,[::1]/')).to.deep.equal(
        expected(['localhost', '::1'])
      );
      expect(actual('mongodb://localhost,[::1]:999/')).to.deep.equal(
        expected(['localhost', '::1'])
      );
      expect(actual('mongodb://localhost,bar.foo.net/')).to.deep.equal(
        expected(['localhost', 'bar.foo.net'])
      );
      expect(actual('mongodb+srv://bar.foo.net/')).to.deep.equal(
        expected(['*.foo.net'])
      );
      expect(actual('mongodb://127.0.0.1:12345/')).to.deep.equal(
        expected(['127.0.0.1'])
      );
      expect(actual('mongodb://2130706433:12345/')).to.deep.equal(
        expected(['2130706433'])
      ); // decimal IPv4
    });
  });

  context('when cli args have oidcFlows', function () {
    it('maps to oidc allowedFlows', function () {
      expect(optionsTest({ oidcFlows: 'a,b,c' })).to.deep.equal({
        driver: { oidc: { allowedFlows: ['a', 'b', 'c'] } },
      });
      expect(optionsTest({ oidcFlows: 'a,,c' })).to.deep.equal({
        driver: { oidc: { allowedFlows: ['a', 'c'] } },
      });
      expect(optionsTest({ oidcFlows: ',' })).to.deep.equal({
        driver: { oidc: { allowedFlows: [] } },
      });
    });
  });

  context('when cli args have oidcNoNonce', function () {
    const cliOptions: CliOptions = {
      oidcNoNonce: true,
    };

    it('maps to oidc skipNonceInAuthCodeRequest', function () {
      expect(optionsTest(cliOptions)).to.deep.equal({
        driver: {
          oidc: {
            skipNonceInAuthCodeRequest: true,
          },
        },
      });
    });
  });

  context('when cli args have browser', function () {
    it('maps to oidc command', function () {
      expect(optionsTest({ browser: '/usr/bin/browser' })).to.deep.equal({
        driver: {
          oidc: {
            openBrowser: {
              command: '/usr/bin/browser',
            },
          },
        },
      });

      expect(optionsTest({ browser: false })).to.deep.equal({
        driver: {
          oidc: {
            openBrowser: false,
          },
        },
      });
    });
  });
});
