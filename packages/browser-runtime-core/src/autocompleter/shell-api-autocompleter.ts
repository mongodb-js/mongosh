import cliReplCompleter, { AutocompleteParameters } from '@mongosh/autocomplete';
import { Autocompleter, Completion } from './autocompleter';

export class ShellApiAutocompleter implements Autocompleter {
  private parameters: AutocompleteParameters;

  constructor(parameters: AutocompleteParameters) {
    this.parameters = parameters;
  }

  async getCompletions(code: string): Promise<Completion[]> {
    if (!code) {
      return [];
    }

    const completions = cliReplCompleter(this.parameters, code);

    if (!completions || !completions.length) {
      return [];
    }

    const entries = completions[0].map((completion) => {
      return {
        completion
      };
    });

    return entries;
  }
}
