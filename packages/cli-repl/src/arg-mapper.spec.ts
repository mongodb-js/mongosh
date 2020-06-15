import mapCliToDriver from './arg-mapper';
import { CliOptions } from '@mongosh/service-provider-server';
import { expect } from 'chai';

describe('arg-mapper.mapCliToDriver', () => {
  context('when cli args have authenticationDatabase', () => {
    const cliOptions: CliOptions = { authenticationDatabase: 'authDb' };

    it('maps to authSource', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authSource: 'authDb'
      });
    });
  });

  context('when cli args have authenticationMechanism', () => {
    const cliOptions: CliOptions = { authenticationMechanism: 'SCRAM-SHA-1' };

    it('maps to authMechanism', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authMechanism: 'SCRAM-SHA-1'
      });
    });
  });

  // context('when cli args have disableImplicitSessions', () => {
  //   const cliOptions: CliOptions = { disableImplicitSessions: true };
  //
  //   it('maps to explicitlyIgnoreSession', () => {
  //     expect(mapCliToDriver(cliOptions)).to.deep.equal({
  //       explicitlyIgnoreSession: true
  //     });
  //   });
  // });

  context('when cli args have quiet', () => {
    const cliOptions: CliOptions = { quiet: true };

    it('maps to loggerLevel', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        loggerLevel: 'error'
      });
    });
  });

  context('when cli args have verbose', () => {
    const cliOptions: CliOptions = { verbose: true };

    it('maps to loggerLevel', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        loggerLevel: 'debug'
      });
    });
  });

  context('when cli args have username', () => {
    const cliOptions: CliOptions = { username: 'richard' };

    it('maps to auth object', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          user: 'richard'
        }
      });
    });
  });

  context('when cli args have password', () => {
    const cliOptions: CliOptions = { password: 'aphextwin' };

    it('maps to auth object', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          password: 'aphextwin'
        }
      });
    });
  });

  context('when cli args have username and password', () => {
    const cliOptions: CliOptions = { username: 'richard', password: 'aphextwin' };

    it('maps to auth object', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          user: 'richard',
          password: 'aphextwin'
        }
      });
    });
  });

  context('when cli args have retryWrites', () => {
    const cliOptions: CliOptions = { retryWrites: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        retryWrites: true
      });
    });
  });

  context('when cli args have tls', () => {
    const cliOptions: CliOptions = { tls: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tls: true
      });
    });
  });

  context('when cli args have tlsAllowInvalidCertificates', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidCertificates: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsAllowInvalidCertificates: true
      });
    });
  });

  context('when cli args have tlsAllowInvalidHostnames', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidHostnames: true };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsAllowInvalidHostnames: true
      });
    });
  });

  context('when cli args have tlsCAFile', () => {
    const cliOptions: CliOptions = { tlsCAFile: 'ca' };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCAFile: 'ca'
      });
    });
  });

  context('when cli args have tlsCertificateKeyFile', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFile: 'key' };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCertificateKeyFile: 'key'
      });
    });
  });

  context('when cli args have tlsCertificateKeyFilePassword', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFilePassword: 'pw' };

    it('maps the same argument', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCertificateKeyFilePassword: 'pw'
      });
    });
  });

  context('when the cli args have awsAccessKeyId', () => {
    const cliOptions: CliOptions = { awsAccessKeyId: 'awskey' };

    it('maps to autoEncryption', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          kmsProviders: {
            aws: {
              accessKeyId: 'awskey'
            }
          }
        }
      });
    });
  });

  context('when the cli args have awsSecretAccessKey', () => {
    const cliOptions: CliOptions = { awsSecretAccessKey: 'secretkey' };

    it('maps to autoEncryption', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          kmsProviders: {
            aws: {
              secretAccessKey: 'secretkey'
            }
          }
        }
      });
    });
  });

  context('when the cli args have keyVaultNamespace', () => {
    const cliOptions: CliOptions = { keyVaultNamespace: 'db.datakeys' };

    it('maps to autoEncryption', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          keyVaultNamespace: 'db.datakeys'
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
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        autoEncryption: {
          keyVaultNamespace: 'db.datakeys',
          kmsProviders: {
            aws: {
              accessKeyId: 'awskey',
              secretAccessKey: 'secretkey'
            }
          }
        }
      });
    });
  });
});
