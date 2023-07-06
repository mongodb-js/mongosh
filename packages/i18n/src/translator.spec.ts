import { MongoshInternalError } from '@mongosh/errors';
import { fail } from 'assert';
import { expect } from 'chai';
import Translator from './translator';

describe('Translator', function () {
  describe('#setLocale', function () {
    context('when the locale exists', function () {
      const translator = new Translator({});

      beforeEach(function () {
        translator.setLocale('en_US');
      });

      it('sets the catalog', function () {
        expect(translator.translate('cli-repl.cli-repl.connecting')).to.equal(
          'Connecting to:'
        );
      });
    });

    context('when the locale does not exist', function () {
      const translator = new Translator({});

      beforeEach(function () {
        translator.setLocale('de');
      });

      it('sets the default catalog', function () {
        expect(translator.translate('cli-repl.cli-repl.connecting')).to.equal(
          'Connecting to:'
        );
      });
    });
  });

  describe('#translateApiHelp', function () {
    const translator = new Translator();

    context('when the result is a string', function () {
      it('returns the string', function () {
        expect(
          translator.translateApiHelp(
            'shell-api.classes.ShellApi.help.description'
          )
        ).to.equal('Shell Help');
      });
    });

    context('when the result is an object', function () {
      it('returns the api formatted template', function () {
        expect(
          translator.translateApiHelp(
            'shell-api.classes.Collection.help.attributes.aggregate'
          )
        ).to.include('Calculates');
      });
    });

    context('when the key is not found', function () {
      it('returns undefined', function () {
        expect(translator.translateApiHelp('testing.testing.testing')).to.equal(
          undefined
        );
      });
    });
  });

  describe('#translate', function () {
    context('when providing a catalog', function () {
      context('when providing a key', function () {
        context('when the key does not use object notation', function () {
          const translator = new Translator({ test: 'value' });

          context('when the key is found', function () {
            it('returns the translation', function () {
              expect(translator.translate('test')).to.equal('value');
            });
          });

          context('when the key is not found', function () {
            it('returns undefined', function () {
              expect(translator.translate('testing')).to.equal(undefined);
            });
          });
        });

        context('when the key uses object notation', function () {
          const translator = new Translator({ test: { test: 'value' } });

          context('when the key is found', function () {
            it('returns the translation', function () {
              expect(translator.translate('test.test')).to.equal('value');
            });
          });

          context('when the key is not found', function () {
            it('returns undefined', function () {
              expect(translator.translate('testing.testing.testing')).to.equal(
                undefined
              );
            });
          });
        });
      });
    });

    context('when not providing a catalog', function () {
      context('when providing a key', function () {
        context('when the key does not use object notation', function () {
          const translator = new Translator();

          context('when the key is found', function () {
            it('returns the translation', function () {
              expect(
                translator.translate('cli-repl.cli-repl.connecting')
              ).to.equal('Connecting to:');
            });
          });
        });
      });
    });
  });

  describe('#__', function () {
    const translator = new Translator();

    it('returns the string for existing key', function () {
      expect(
        translator.__('shell-api.classes.ShellApi.help.description')
      ).to.equal('Shell Help');
    });

    it('throws an error for missing key', function () {
      try {
        translator.__('testing.testing.testing');
        fail('expected error');
      } catch (e: any) {
        expect(e).to.be.instanceOf(MongoshInternalError);
      }
    });
  });
});
