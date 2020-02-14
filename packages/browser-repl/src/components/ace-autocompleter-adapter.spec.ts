import sinon from 'sinon';
import util from 'util';
import { AceAutocompleterAdapter } from './ace-autocompleter-adapter';
import { expect } from '../../testing/chai';
import { Completion } from '../lib/autocompleter/autocompleter';

async function testGetCompletions(adaptee, textBeforeCursor): Promise<Completion[]> {
  const completer = new AceAutocompleterAdapter(adaptee as any);
  const getCompletions = util.promisify(completer.getCompletions.bind(completer));

  const rows = textBeforeCursor.split('\n');

  return await getCompletions(
    null,
    {
      getLine: (i) => rows[i]
    },
    {
      row: rows.length - 1,
      column: rows[rows.length - 1].length
    },
    null
  );
}

describe('AceAutocompleterAdapter', () => {
  describe('getCompletions', () => {
    it('calls adaptee.getCompletions with code', async() => {
      const adaptee = {
        getCompletions: sinon.spy(() => Promise.resolve([]))
      };

      await testGetCompletions(adaptee, 'text');

      expect(adaptee.getCompletions).to.have.been.calledWith('text');
    });

    it('ignores spaces', async() => {
      const adaptee = {
        getCompletions: sinon.spy(() => Promise.resolve([]))
      };

      await testGetCompletions(adaptee, 'some text');

      expect(adaptee.getCompletions).to.have.been.calledWith('text');
    });

    it('passes dots', async() => {
      const adaptee = {
        getCompletions: sinon.spy(() => Promise.resolve([]))
      };

      await testGetCompletions(adaptee, 'some.text');

      expect(adaptee.getCompletions).to.have.been.calledWith('some.text');
    });

    it('only gets cursor line', async() => {
      const adaptee = {
        getCompletions: sinon.spy(() => Promise.resolve([]))
      };

      await testGetCompletions(adaptee, 'this is\nsome text');

      expect(adaptee.getCompletions).to.have.been.calledWith('text');
    });

    it('converts the completions to the ace format', async() => {
      const adaptee = {
        getCompletions: sinon.spy(() => Promise.resolve([
          {
            completion: 'a.completion'
          }
        ]))
      };

      const completions = await testGetCompletions(adaptee, '');

      expect(completions).to.deep.equal([{
        value: 'completion',
        caption: 'completion'
      }]);
    });
  });
});

