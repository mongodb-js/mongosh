import Translator from './translator';
import { expect } from 'chai';

describe('Translator', () => {
  describe('#setLocale', () => {
    context('when the locale exists', () => {
      const translator = new Translator({});

      beforeEach(() => {
        translator.setLocale('en_US');
      });

      it('sets the catalog', () => {
        expect(translator.translate('cli-repl.cli-repl.connecting')).
          to.equal('Connecting to:');
      });
    });

    context('when the locale does not exist', () => {
      const translator = new Translator({});

      beforeEach(() => {
        translator.setLocale('de');
      });

      it('sets the default catalog', () => {
        expect(translator.translate('cli-repl.cli-repl.connecting')).
          to.equal('Connecting to:');
      });
    });
  });

  describe('#translateApiHelp', () => {
    const translator = new Translator();

    context('when the result is a string', () => {
      it('returns the string', () => {
        expect(translator.translateApiHelp('shell-api.help')).
          to.equal('Welcome to the new MongoDB Shell!');
      });
    });

    context('when the result is an object', () => {
      it('returns the api formatted template', () => {
        expect(translator.translateApiHelp('shell-api.collection.help.aggregate')).
          to.include('Calculates');
      });
    });

    context('when the key is not found', () => {
      it('returns undefined', () => {
        expect(translator.translateApiHelp('testing.testing.testing')).
          to.equal(undefined);
      });
    });
  });

  describe('#translate', () => {
    context('when providing a catalog', () => {
      context('when providing a key', () => {
        context('when the key does not use object notation', () => {
          const translator = new Translator({ test: 'value' });

          context('when the key is found', () => {
            it('returns the translation', () => {
              expect(translator.translate('test')).to.equal('value');
            });
          });

          context('when the key is not found', () => {
            it('returns undefined', () => {
              expect(translator.translate('testing')).to.equal(undefined);
            });
          });
        });

        context('when the key uses object notation', () => {
          const translator = new Translator({ test: { test: 'value' }});

          context('when the key is found', () => {
            it('returns the translation', () => {
              expect(translator.translate('test.test')).to.equal('value');
            });
          });

          context('when the key is not found', () => {
            it('returns undefined', () => {
              expect(translator.translate('testing.testing.testing')).
                to.equal(undefined);
            });
          });
        });
      });
    });

    context('when not providing a catalog', () => {
      context('when providing a key', () => {
        context('when the key does not use object notation', () => {
          const translator = new Translator();

          context('when the key is found', () => {
            it('returns the translation', () => {
              expect(translator.translate('cli-repl.cli-repl.connecting')).
                to.equal('Connecting to:');
            });
          });
        });
      });
    });
  });
});
