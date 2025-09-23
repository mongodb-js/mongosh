import type { AutocompletionContext } from '@mongodb-js/mongodb-ts-autocomplete';
import type { TypeSignature } from '@mongosh/shell-api';
import { signatures as shellSignatures } from '@mongosh/shell-api';

type TypeSignatureAttributes = { [key: string]: TypeSignature };

export async function directCommandCompleter(
  context: AutocompletionContext,
  line: string
): Promise<string[]> {
  const SHELL_COMPLETIONS = shellSignatures.ShellApi
    .attributes as TypeSignatureAttributes;

  // Split at space-to-non-space transitions when looking at this as a command,
  // because multiple spaces (e.g. 'show  collections') are valid in commands.
  // This split keeps the spaces intact so we can join them back later.
  const splitLineWhitespace = line.split(/(?<!\S)(?=\S)/);
  const command = splitLineWhitespace[0].trim();
  if (!SHELL_COMPLETIONS[command]?.isDirectShellCommand) {
    return [];
  }

  // If the shell API provides us with a completer, use it.
  // examples: use, show, snippet
  const completer = SHELL_COMPLETIONS[command].newShellCommandCompleter;
  if (!completer) {
    // examples without a custom completer: exit, quit, it, cls
    return [line];
  }

  if (splitLineWhitespace.length === 1) {
    if (splitLineWhitespace[0].trimEnd() === splitLineWhitespace[0]) {
      // Treat e.g. 'show' like 'show '.
      splitLineWhitespace[0] += ' ';
    }

    // Complete the first argument after the command.
    splitLineWhitespace.push('');
  }
  const hits =
    (await completer(
      context,
      splitLineWhitespace.map((item) => item.trim())
    )) || [];
  // Adjust to full input, because `completer` only completed the last item
  // in the line, e.g. ['profile'] -> ['show profile']
  const fullLineHits = hits.map((hit) =>
    [...splitLineWhitespace.slice(0, -1), hit].join('')
  );

  return fullLineHits;
}
