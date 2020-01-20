import generateUri from './uri-generator';
import { expect } from 'chai';

// Current shell assumes any additional parameter in the _
// array is a file.

describe('uri-generator.generate-uri', () => {
  context('when a full URI is provided', () => {
    context('when no additional options are provided', () => {
      const uri = 'mongodb://192.0.0.1:27018/foo';
      const options = { _: [ uri ]};

      it('returns the uri', () => {
        expect(generateUri(options)).to.equal(uri);
      });
    });
  });

  context('when a URI is provided without a scheme', () => {
    context('when providing host:port/db', () => {
      context('when no additional options are provided', () => {
        const uri = '192.0.0.1:27018/foo';
        const options = { _: [ uri ]};

        it('returns the uri with the scheme', () => {
          expect(generateUri(options)).to.equal(`mongodb://${uri}`);
        });
      });

      context('when additional options are provided', () => {
        context('when providing host', () => {
          const uri = '192.0.0.1:27018/foo';
          const options = { _: [ uri ], host: '127.0.0.1' };

          it('throws an exception', () => {
            expect(generateUri.bind(options)).to.throw();
          });
        });

        context('when providing port', () => {
          const uri = '192.0.0.1:27018/foo';
          const options = { _: [ uri ], port: '27018' };

          it('throws an exception', () => {
            expect(generateUri.bind(options)).to.throw();
          });
        });
      });
    });

    context('when providing host:port', () => {
      context('when no additional options are provided', () => {
        const uri = '192.0.0.1:27018';
        const options = { _: [ uri ]};
      });

      context('when additional options are provided', () => {
        context('when providing host', () => {
          const uri = '192.0.0.1:27018';
          const options = { _: [ uri ], host: '127.0.0.1' };
        });

        context('when providing port', () => {
          const uri = '192.0.0.1:27018';
          const options = { _: [ uri ], port: '27018' };
        });
      });
    });

    context('when providing only a host', () => {
      context('when no additional options are provided', () => {
        const uri = '192.0.0.1';
        const options = { _: [ uri ]};
      });

      context('when additional options are provided', () => {
        context('when providing host', () => {
          const uri = '192.0.0.1';
          const options = { _: [ uri ], host: '127.0.0.1' };
        });

        context('when providing port', () => {
          const uri = '192.0.0.1';
          const options = { _: [ uri ], port: '27018' };
        });
      });
    });

    context('when providing only a port', () => {
      context('when no additional options are provided', () => {
        const uri = '27018';
        const options = { _: [ uri ]};
      });

      context('when additional options are provided', () => {
        context('when providing host', () => {
          const uri = '27018';
          const options = { _: [ uri ], host: '127.0.0.1' };
        });

        context('when providing port', () => {
          const uri = '27018';
          const options = { _: [ uri ], port: '27018' };
        });
      });
    });
  });

  context('when a db name is provided', () => {
    context('when no additional options are provided', () => {
      const db = 'foo';
      const options = { _: [ db ]};

      it('returns the uri with mongodb://127.0.0.1:27017', () => {
        expect(generateUri(options)).to.equal(`mongodb://127.0.0.1:27017/${db}`);
      });
    });
  });

  context('when no URI is provided', () => {

  });
});
