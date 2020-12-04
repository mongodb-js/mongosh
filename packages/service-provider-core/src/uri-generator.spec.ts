import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import { fail } from 'assert';
import { expect } from 'chai';
import generateUri from './uri-generator';

describe('uri-generator.generate-uri', () => {
  context('when no arguments are provided', () => {
    const options = { _: [] };

    it('returns the default uri', () => {
      expect(generateUri(options)).to.equal('mongodb://127.0.0.1:27017');
    });
  });

  context('when no URI is provided', () => {
    it('handles host', () => {
      expect(generateUri({ _: [], host: 'localhost' })).to.equal('mongodb://localhost:27017');
    });
    it('handles port', () => {
      expect(generateUri({ _: [], port: '27018' })).to.equal('mongodb://127.0.0.1:27018');
    });
    it('handles both host and port', () => {
      expect(generateUri({ _: [], host: 'localhost', port: '27018' })).to.equal('mongodb://localhost:27018');
    });
    it('handles host with port included', () => {
      expect(generateUri({ _: [], host: 'localhost:27018' })).to.equal('mongodb://localhost:27018');
    });
    it('throws if host has port AND port set to other value', () => {
      try {
        generateUri({ _: [], host: 'localhost:27018', port: '27019' });
        fail('expected error');
      } catch (e) {
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
      }
    });
    it('handles host has port AND port set to equal value', () => {
      expect(generateUri({ _: [], host: 'localhost:27018', port: '27018' })).to.equal('mongodb://localhost:27018');
    });
  });

  context('when a full URI is provided', () => {
    context('when no additional options are provided', () => {
      const uri = 'mongodb://192.0.0.1:27018/foo';
      const options = { _: [uri] };

      it('returns the uri', () => {
        expect(generateUri(options)).to.equal(uri);
      });
    });

    context('when additional options are provided', () => {
      context('when providing host with URI', () => {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { _: [uri], host: '127.0.0.1' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            fail('expected error');
          } catch (e) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing port with URI', () => {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { _: [uri], port: '27018' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            fail('expected error');
          } catch (e) {
            expect(e.name).to.equal('MongoshInvalidInputError');
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });
    });
  });

  context('when a URI is provided without a scheme', () => {
    context('when providing host', () => {
      const uri = '192.0.0.1';
      const options = { _: [uri] };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}:27017/test`);
      });
    });

    context('when providing host:port', () => {
      const uri = '192.0.0.1:27018';
      const options = { _: [uri] };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}/test`);
      });
    });

    context('when proving host + port option', () => {
      const uri = '192.0.0.1';
      const options = { _: [uri], port: '27018' };

      it('throws an exception', () => {
        try {
          generateUri(options);
          fail('expected error');
        } catch (e) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    context('when no additional options are provided', () => {
      const uri = '192.0.0.1:27018/foo';
      const options = { _: [uri] };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}`);
      });
    });

    context('when additional options are provided', () => {
      context('when providing host with URI', () => {
        const uri = '192.0.0.1:27018/foo';
        const options = { _: [uri], host: '127.0.0.1' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            fail('expected error');
          } catch (e) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing host with db', () => {
        const uri = 'foo';
        const options = { _: [uri], host: '127.0.0.2' };

        it('uses the provided host with default port', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.2:27017/foo');
        });
      });

      context('when providing port with URI', () => {
        const uri = '192.0.0.1:27018/foo';
        const options = { _: [uri], port: '27018' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            fail('expected error');
          } catch (e) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing port with db', () => {
        const uri = 'foo';
        const options = { _: [uri], port: '27018' };

        it('uses the provided host with default port', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.1:27018/foo');
        });
      });

      context('when providing port with only a host URI', () => {
        const uri = '127.0.0.2/foo';
        const options = { _: [uri], port: '27018' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            fail('expected error');
          } catch (e) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });
    });
  });


  context('when an invalid URI is provided', () => {
    const uri = '/x';
    const options = { _: [uri] };

    it('returns the uri', () => {
      try {
        generateUri(options);
        fail('expected error');
      } catch (e) {
        expect(e.message).to.contain('Invalid URI: /x');
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
      }
    });
  });
});
