import { ShellApiAutocompleter } from './shell-api-autocompleter';
import { expect } from '../../../testing/chai';

describe('Autocompleter', () => {
  describe('getCompletions', () => {
    let autocompleter;

    beforeEach(() => {
      autocompleter = new ShellApiAutocompleter('4.2.1');
    });

    it('returns completions for text before cursor', async() => {
      const completions = await autocompleter.getCompletions('db.coll1.');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find'
      });
    });

    it('returns full completion value with text after dot', async() => {
      const completions = await autocompleter.getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find'
      });
    });
  });
});


