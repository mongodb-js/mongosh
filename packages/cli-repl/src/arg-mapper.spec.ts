import mapCliToDriver from './arg-mapper';
import { CliOptions } from '@mongosh/service-provider-server';
import { expect } from 'chai';
import { MongoshInvalidInputError } from '@mongosh/errors';

describe('arg-mapper.mapCliToDriver', () => {
  context('when cli args have authenticationDatabase', () => {
    const cliOptions: CliOptions = { authenticationDatabase: 'authDb' };

    it('maps to authSource', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        authSource: 'authDb'
      });
    });
  });

  context('when cli args have authenticationMechanism', () => {
    const cliOptions: CliOptions = { authenticationMechanism: 'SCRAM-SHA-1' };

    it('maps to authMechanism', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        authMechanism: 'SCRAM-SHA-1'
      });
    });
  });

  context('when cli args have quiet', () => {
    const cliOptions: CliOptions = { quiet: true };

    it('maps to loggerLevel', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        loggerLevel: 'error'
      });
    });
  });

  context('when cli args have verbose', () => {
    const cliOptions: CliOptions = { verbose: true };

    it('maps to loggerLevel', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        loggerLevel: 'debug'
      });
    });
  });

  context('when cli args have username', () => {
    const cliOptions: CliOptions = { username: 'richard' };

    it('maps to auth object', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          username: 'richard'
        }
      });
    });
  });

  context('when cli args have password', () => {
    const cliOptions: CliOptions = { password: 'aphextwin' };

    it('maps to auth object', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          password: 'aphextwin'
        }
      });
    });
  });

  context('when cli args have username and password', () => {
    const cliOptions: CliOptions = { username: 'richard', password: 'aphextwin' };

    it('maps to auth object', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        auth: {
          username: 'richard',
          password: 'aphextwin'
        }
      });
    });
  });

  context('when cli args have retryWrites', () => {
    const cliOptions: CliOptions = { retryWrites: true };

    it('maps the same argument', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        retryWrites: true
      });
    });
  });

  context('when cli args have tls', () => {
    const cliOptions: CliOptions = { tls: true };

    it('maps the same argument', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        tls: true
      });
    });
  });

  context('when cli args have tlsAllowInvalidCertificates', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidCertificates: true };

    it('maps the same argument', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        tlsAllowInvalidCertificates: true
      });
    });
  });

  context('when cli args have tlsAllowInvalidHostnames', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidHostnames: true };

    it('maps the same argument', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        tlsAllowInvalidHostnames: true
      });
    });
  });

  context('when cli args have tlsCAFile', () => {
    const cliOptions: CliOptions = { tlsCAFile: 'ca' };

    it('maps the same argument', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCAFile: 'ca'
      });
    });
  });

  context('when cli args have tlsCRLFile', () => {
    it('the file content is extracted', async() => {
      // using the lazy fixture trick: FANCY CRL FIXTURE
      const opts = await mapCliToDriver({ tlsCRLFile: __filename });
      expect(opts.sslCRL).to.contain('FANCY CRL FIXTURE');
    });

    it('throws an error when the file does not exist', async() => {
      const err = await mapCliToDriver({
        tlsCRLFile: '/THERE_IS_NO_ROOT'
      }).catch(e => e);
      expect(err).to.be.instanceOf(MongoshInvalidInputError);
      expect(err.message).to.contain('The file specified by --tlsCRLFile does not exist or cannot be read');
    });
  });

  context('when cli args have tlsCertificateKeyFile', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFile: 'key' };

    it('maps the same argument', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCertificateKeyFile: 'key'
      });
    });
  });

  context('when cli args have tlsCertificateKeyFilePassword', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFilePassword: 'pw' };

    it('maps the same argument', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
        tlsCertificateKeyFilePassword: 'pw'
      });
    });
  });

  context('when the cli args have awsAccessKeyId', () => {
    const cliOptions: CliOptions = { awsAccessKeyId: 'awskey' };

    it('maps to autoEncryption', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
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

    it('maps to autoEncryption', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
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

    it('maps to autoEncryption', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
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

    it('maps to autoEncryption', async() => {
      expect(await mapCliToDriver(cliOptions)).to.deep.equal({
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
