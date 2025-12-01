import { expect } from 'chai';
import { parseMongoshArgs } from './parse-mongosh-args';
import stripAnsi from 'strip-ansi';
import { MongoshUnimplementedError } from '@mongosh/errors';

describe('parseMongoshArgs', function () {
  const baseArgv = ['node', 'mongosh'];
  const uri = 'mongodb://domain.com:2020';
  context('when providing an unknown parameter', function () {
    const argv = [...baseArgv, uri, '--what'];

    it('raises an error', function () {
      try {
        parseMongoshArgs(argv);
      } catch (err: any) {
        return expect(stripAnsi(err.message)).to.contain(
          'Error parsing command line: unrecognized option: --what'
        );
      }
      expect.fail('parsing unknown parameter did not throw');
    });

    context('parses standard arguments correctly', function () {
      it('parses connectionSpecifier correctly', function () {
        const argv = [...baseArgv, uri];
        const args = parseMongoshArgs(argv);
        expect(args.parsed.connectionSpecifier).to.equal(uri);
      });

      it('parses fileNames correctly', function () {
        const argv = [...baseArgv, uri, 'file1.js', 'file2.js'];
        const args = parseMongoshArgs(argv);
        expect(args.parsed.fileNames).to.deep.equal(['file1.js', 'file2.js']);
      });

      it('sets passed fields', function () {
        const argv = [...baseArgv, uri, '--tls', '--port', '1234'];

        const args = parseMongoshArgs(argv);
        expect(args.parsed['tls']).equals(true);
        expect(args.parsed['port']).equals('1234');
      });

      it('throws an error for unsupported arguments', function () {
        const argv = [...baseArgv, '--gssapiHostName', 'example.com'];
        expect(() => parseMongoshArgs(argv)).to.throw(
          MongoshUnimplementedError,
          'Argument --gssapiHostName is not supported in mongosh'
        );
      });

      it(`replaces --sslPEMKeyFile with --tlsCertificateKeyFile`, function () {
        const argv = [...baseArgv, `--sslPEMKeyFile`, `test`];

        const args = parseMongoshArgs(argv);
        expect(args).to.not.have.property('sslPEMKeyFile');
        expect(args.parsed['tlsCertificateKeyFile']).to.equal('test');
        expect(args.warnings).to.deep.equal([
          'WARNING: argument --sslPEMKeyFile is deprecated and will be removed. Use --tlsCertificateKeyFile instead.',
        ]);
      });
    });
  });
});
