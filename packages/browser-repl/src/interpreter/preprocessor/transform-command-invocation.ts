export function transformCommandInvocation(code: string, availableCommands: string[]): string {
  const tokens = code.trim().split(/\s+/);
  const command = tokens[0];
  if (!availableCommands.includes(command)) {
    return code;
  }

  tokens.shift();

  const args = tokens
    .map(token => JSON.stringify(token))
    .join(',');

  return `${command}(${args})`;
}
