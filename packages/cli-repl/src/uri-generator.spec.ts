import generateUri from './uri-generator';
import { expect } from 'chai';

describe('uri-generator.generate-uri', () => {
  context('when no arguments are provided', () => {
    const options = { _: [] };

    it('returns the default uri', () => {
      expect(generateUri(options)).to.equal('mongodb://127.0.0.1:27017');
    });
  });

  context('when a full URI is provided', () => {
    context('when no additional options are provided', () => {
      const uri = 'mongodb://192.0.0.1:27018/foo';
      const options = { _: [ uri ] };

      it('returns the uri', () => {
        expect(generateUri(options)).to.equal(uri);
      });
    });

    context('when additional options are provided', () => {
      context('when providing host with URI', () => {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { _: [ uri ], host: '127.0.0.1' };

        it('throws an exception', () => {
          expect(generateUri.bind(null, options)).to.throw();
        });
      });

      context('when providing port with URI', () => {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { _: [ uri ], port: '27018' };

        it('throws an exception', () => {
          expect(generateUri.bind(null, options)).to.throw();
        });
      });
    });
  });

  context('when a URI is provided without a scheme', () => {
    context('when providing host', () => {
      const uri = '192.0.0.1';
      const options = { _: [ uri ] };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}:27017/test`);
      });
    });

    context('when providing host:port', () => {
      const uri = '192.0.0.1:27018';
      const options = { _: [ uri ] };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}/test`);
      });
    });

    context('when proving host + port option', () => {
      const uri = '192.0.0.1';
      const options = { _: [ uri ], port: '27018' };

      it('returns the uri with the scheme', () => {
        expect(generateUri.bind(null, options)).to.throw();
      });
    });

    context('when no additional options are provided', () => {
      const uri = '192.0.0.1:27018/foo';
      const options = { _: [ uri ] };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}`);
      });
    });

    context('when additional options are provided', () => {
      context('when providing host with URI', () => {
        const uri = '192.0.0.1:27018/foo';
        const options = { _: [ uri ], host: '127.0.0.1' };

        it('throws an exception', () => {
          expect(generateUri.bind(null, options)).to.throw();
        });
      });

      context('when providing host with db', () => {
        const uri = 'foo';
        const options = { _: [ uri ], host: '127.0.0.2' };

        it('uses the provided host with default port', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.2:27017/foo');
        });
      });

      context('when providing port with URI', () => {
        const uri = '192.0.0.1:27018/foo';
        const options = { _: [ uri ], port: '27018' };

        it('throws an exception', () => {
          expect(generateUri.bind(null, options)).to.throw();
        });
      });

      context('when providing port with db', () => {
        const uri = 'foo';
        const options = { _: [ uri ], port: '27018' };

        it('uses the provided host with default port', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.1:27018/foo');
        });
      });

      context('when providing port with only a host URI', () => {
        const uri = '127.0.0.2/foo';
        const options = { _: [ uri ], port: '27018' };

        it('throws an exception', () => {
          expect(generateUri.bind(null, options)).to.throw();
        });
      });
    });
  });
});
