import cliReplCompleter from 'mongosh-cli-repl/lib/completer';
import { Autocompleter, Completion } from './autocompleter';

export class ShellApiAutocompleter implements Autocompleter {
  private serverVersion: string;

  constructor(serverVersion) {
    this.serverVersion = serverVersion;
  }

  async getCompletions(code: string): Promise<Completion[]> {
    if (!code) {
      return [];
    }

    const completions = cliReplCompleter(this.serverVersion, code);

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
