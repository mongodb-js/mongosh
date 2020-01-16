import mapCliToDriver from './arg-mapper';
import CliOptions from './cli-options';
import { expect } from 'chai';

describe('arg-mapper.mapCliToDriver', () => {
  context('when cli args has authenticationDatabase', () => {
    const cliOptions: CliOptions = { authenticationDatabase: 'authDb' };

    it('maps to authSource', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authSource: 'authDb'
      });
    });
  });

  context('when cli args has authenticationMechanism', () => {
    const cliOptions: CliOptions = { authenticationMechanism: 'SCRAM-SHA-1' };

    it('maps to authMechanism', () => {
      expect(mapCliToDriver(cliOptions)).to.deep.equal({
        authMechanism: 'SCRAM-SHA-1'
      });
    });
  });

  context('when cli args has disableImplicitSessions', () => {
    const cliOptions: CliOptions = { disableImplicitSessions: true };

  });

  context('when cli args has quiet', () => {
    const cliOptions: CliOptions = { quiet: true };

  });

  context('when cli args has verbose', () => {
    const cliOptions: CliOptions = { verbose: true };

  });

  context('when cli args has username', () => {
    const cliOptions: CliOptions = { username: 'richard' };

  });

  context('when cli args has password', () => {
    const cliOptions: CliOptions = { password: 'aphextwin' };

  });

  context('when cli args has retryWrites', () => {
    const cliOptions: CliOptions = { retryWrites: true };

  });

  context('when cli args has tls', () => {
    const cliOptions: CliOptions = { tls: true };

  });

  context('when cli args has tlsAllowInvalidCertificates', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidCertificates: true };

  });

  context('when cli args has tlsAllowInvalidHostnames', () => {
    const cliOptions: CliOptions = { tlsAllowInvalidHostnames: true };

  });

  context('when cli args has tlsCAFile', () => {
    const cliOptions: CliOptions = { tlsCAFile: 'ca' };

  });

  context('when cli args has tlsCertificateKeyFile', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFile: 'key' };

  });

  context('when cli args has tlsCertificateKeyFilePassword', () => {
    const cliOptions: CliOptions = { tlsCertificateKeyFilePassword: 'pw' };

  });
});
