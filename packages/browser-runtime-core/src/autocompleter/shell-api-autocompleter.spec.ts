import { ShellApiAutocompleter } from './shell-api-autocompleter';
import { expect } from 'chai';
import type { AutocompleteParameters } from '@mongosh/autocomplete';
import type { AutocompletionContext } from '@mongodb-js/mongodb-ts-autocomplete';

const standalone440Parameters: AutocompleteParameters = {
  topology: () => 'Standalone',
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({
    is_atlas: false,
    is_data_federation: false,
    server_version: '4.4.0',
    is_local_atlas: false,
  }),
  getCollectionCompletionsForCurrentDb: () => Promise.resolve(['bananas']),
  getDatabaseCompletions: () => Promise.resolve(['databaseOne']),
};

const standalone440Context: AutocompletionContext = {
  currentDatabaseAndConnection: () => ({
    connectionId: 'connection-1',
    databaseName: 'databaseOne',
  }),
  databasesForConnection: () => Promise.resolve(['databaseOne']),
  collectionsForDatabase: () => Promise.resolve(['bananas', 'coll1']),
  schemaInformationForCollection: () => Promise.resolve({}),
};

const shellInstanceState = {
  getAutocompleteParameters: () => standalone440Parameters,
  getAutocompletionContext: () => standalone440Context,
};

describe('Autocompleter', function () {
  describe('getCompletions', function () {
    let autocompleter: ShellApiAutocompleter;

    beforeEach(function () {
      autocompleter = new ShellApiAutocompleter(shellInstanceState);
    });

    it('returns completions for text before cursor', async function () {
      const completions = await autocompleter.getCompletions('db.coll1.');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find',
      });
    });

    it('returns full completion value with text after dot', async function () {
      const completions = await autocompleter.getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({
        completion: 'db.coll1.find',
      });
    });

    it('returns collection names value with text after dot', async function () {
      const completions = await autocompleter.getCompletions('db.b');

      expect(completions).to.deep.contain({
        completion: 'db.bananas',
      });
    });

    it('returns database names after use', async function () {
      const completions = await autocompleter.getCompletions('use da');

      expect(completions).to.deep.contain({
        completion: 'use databaseOne',
      });
    });
  });
});
