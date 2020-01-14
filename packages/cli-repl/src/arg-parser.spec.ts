import parse from './arg-parser';
import { expect } from 'chai';

const NODE = 'node';
const MONGOSH = 'mongosh';

describe('arg-parser.parse', () => {
  context('when running from a linked bin script', () => {
    const baseArgv = [ NODE, MONGOSH ];

    context('when providing only a URI', () => {
      const uri = 'mongodb://domain.com:20000';
      const argv = [ ...baseArgv, uri];

      it('returns the URI in the object', () => {
        expect(parse(argv)._[0]).to.equal(uri);
      });
    });

    context('when providing a URI + options', () => {
      const uri = 'mongodb://domain.com:20000';

      context('when providing general options', () => {
        context('when providing --ipv6', () => {
          const argv = [ ...baseArgv, uri, '--ipv6' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the ipv6 value in the object', () => {
            expect(parse(argv).ipv6).to.equal(true);
          });
        });

        context('when providing -h', () => {
          const argv = [ ...baseArgv, uri, '-h' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the help value in the object', () => {
            expect(parse(argv).help).to.equal(true);
          });
        });

        context('when providing --help', () => {
          const argv = [ ...baseArgv, uri, '--help' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the help value in the object', () => {
            expect(parse(argv).help).to.equal(true);
          });
        });

        context('when providing --version', () => {
          const argv = [ ...baseArgv, uri, '--version' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the version value in the object', () => {
            expect(parse(argv).version).to.equal(true);
          });
        });

        context('when providing --verbose', () => {
          const argv = [ ...baseArgv, uri, '--verbose' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the verbose value in the object', () => {
            expect(parse(argv).verbose).to.equal(true);
          });
        });

        context('when providing --shell', () => {
          const argv = [ ...baseArgv, uri, '--shell' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the shell value in the object', () => {
            expect(parse(argv).shell).to.equal(true);
          });
        });

        context('when providing --nodb', () => {
          const argv = [ ...baseArgv, uri, '--nodb' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the nodb value in the object', () => {
            expect(parse(argv).nodb).to.equal(true);
          });
        });

        context('when providing --norc', () => {
          const argv = [ ...baseArgv, uri, '--norc' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the norc value in the object', () => {
            expect(parse(argv).norc).to.equal(true);
          });
        });

        context('when providing --quiet', () => {
          const argv = [ ...baseArgv, uri, '--quiet' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the quiet value in the object', () => {
            expect(parse(argv).quiet).to.equal(true);
          });
        });

        context('when providing --eval', () => {
          const argv = [ ...baseArgv, uri, '--eval', '1+1' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the eval value in the object', () => {
            expect(parse(argv).eval).to.equal('1+1');
          });
        });

        context('when providing --retryWrites', () => {
          const argv = [ ...baseArgv, uri, '--retryWrites' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the retryWrites value in the object', () => {
            expect(parse(argv).retryWrites).to.equal(true);
          });
        });

        context('when providing --disableImplicitSessions', () => {
          const argv = [ ...baseArgv, uri, '--disableImplicitSessions' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the disableImplicitSessions value in the object', () => {
            expect(parse(argv).disableImplicitSessions).to.equal(true);
          });
        });
      });

      context('when providing authentication options', () => {
        context('when providing -u', () => {
          const argv = [ ...baseArgv, uri, '-u', 'richard' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the username in the object', () => {
            expect(parse(argv).username).to.equal('richard');
          });
        });

        context('when providing --username', () => {
          const argv = [ ...baseArgv, uri, '--username', 'richard' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the username in the object', () => {
            expect(parse(argv).username).to.equal('richard');
          });
        });

        context('when providing -p', () => {
          const argv = [ ...baseArgv, uri, '-p', 'pw' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the password in the object', () => {
            expect(parse(argv).password).to.equal('pw');
          });
        });

        context('when providing --password', () => {
          const argv = [ ...baseArgv, uri, '--password', 'pw' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the password in the object', () => {
            expect(parse(argv).password).to.equal('pw');
          });
        });

        context('when providing --authenticationDatabase', () => {
          const argv = [ ...baseArgv, uri, '--authenticationDatabase', 'db' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the authenticationDatabase in the object', () => {
            expect(parse(argv).authenticationDatabase).to.equal('db');
          });
        });

        context('when providing --authenticationMechanism', () => {
          const argv = [ ...baseArgv, uri, '--authenticationMechanism', 'SCRAM-SHA-256' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the authenticationMechanism in the object', () => {
            expect(parse(argv).authenticationMechanism).to.equal('SCRAM-SHA-256');
          });
        });

        context('when providing --gssapiServiceName', () => {
          const argv = [ ...baseArgv, uri, '--gssapiServiceName', 'mongosh' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the gssapiServiceName in the object', () => {
            expect(parse(argv).gssapiServiceName).to.equal('mongosh');
          });
        });

        context('when providing --gssapiHostName', () => {
          const argv = [ ...baseArgv, uri, '--gssapiHostName', 'example.com' ];

          it('returns the URI in the object', () => {
            expect(parse(argv)._[0]).to.equal(uri);
          });

          it('sets the gssapiHostName in the object', () => {
            expect(parse(argv).gssapiHostName).to.equal('example.com');
          });
        });
      });
    });

    context('when providing no URI', () => {
      context('when providing a DB address', () => {

      });

      context('when providing no DB address', () => {
        context('when providing a host', () => {

        });

        context('when providing a port', () => {

        });

        context('when proving a host + port', () => {

        });

        context('when providing no host or port', () => {

        });
      });
    });
  });

  context('when running via a built executable', () => {

  });

  context('when running via npm start', () => {

  });
});
