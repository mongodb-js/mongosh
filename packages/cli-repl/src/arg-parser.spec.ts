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
