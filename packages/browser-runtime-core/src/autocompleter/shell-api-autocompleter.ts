import type { AutocompletionContext } from '@mongodb-js/mongodb-ts-autocomplete';
import type {
  AutocompleteParameters,
  CompletionResults,
} from '@mongosh/autocomplete';
import { completer, initNewAutocompleter } from '@mongosh/autocomplete';
import type { Autocompleter, Completion } from './autocompleter';

type AutocompleteShellInstanceState = {
  getAutocompleteParameters: () => AutocompleteParameters;
  getAutocompletionContext: () => AutocompletionContext;
};

export class ShellApiAutocompleter implements Autocompleter {
  private shellInstanceState: AutocompleteShellInstanceState;

  // old autocomplete only:
  private parameters: AutocompleteParameters | undefined;

  // new autocomplete only:
  private newMongoshCompleter:
    | ((line: string) => Promise<CompletionResults>)
    | undefined;

  constructor(shellInstanceState: AutocompleteShellInstanceState) {
    this.shellInstanceState = shellInstanceState;
  }

  async getCompletions(code: string): Promise<Completion[]> {
    if (!code) {
      return [];
    }

    let completions: CompletionResults;

    if (process.env.USE_NEW_AUTOCOMPLETE !== '0') {
      if (!this.newMongoshCompleter) {
        this.newMongoshCompleter = await initNewAutocompleter(
          this.shellInstanceState
        );
      }

      completions = await this.newMongoshCompleter(code);
    } else {
      if (!this.parameters) {
        this.parameters = this.shellInstanceState.getAutocompleteParameters();
      }
      completions = await completer(this.parameters, code);
    }

    if (!completions || !completions.length) {
      return [];
    }

    const entries = completions[0].map((completion) => {
      return {
        completion,
      };
    });

    return entries;
  }
}
