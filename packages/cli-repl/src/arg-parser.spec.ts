import { expect } from 'chai';
import { parseMongoshCliArgs } from './arg-parser';
import stripAnsi from 'strip-ansi';

describe('parseMongoshCliArgs', function () {
  const baseArgv = ['node', 'mongosh'];
  const uri = 'mongodb://domain.com:2020';
  context('when providing an unknown parameter', function () {
    const argv = [...baseArgv, uri, '--what'];

    it('raises an error', function () {
      try {
        parseMongoshCliArgs(argv);
      } catch (err: any) {
        return expect(stripAnsi(err.message)).to.contain(
          'Error parsing command line: unrecognized option: --what'
        );
      }
      expect.fail('parsing unknown parameter did not throw');
    });

    context('parses standard arguments correctly', function () {
      it('sets passed fields', function () {
        const argv = [...baseArgv, uri, '--tls', '--port', '1234'];

        const args = parseMongoshCliArgs(argv);
        expect(args['tls']).equals(true);
        expect(args['port']).equals('1234');
      });

      it(`replaces --sslPEMKeyFile with --tlsCertificateKeyFile`, function () {
        const argv = [...baseArgv, `--sslPEMKeyFile`, `test`];

        const args = parseMongoshCliArgs(argv);
        expect(args).to.not.have.property('sslPEMKeyFile');
        expect(args['tlsCertificateKeyFile']).to.equal('test');
      });
    });
  });
});
