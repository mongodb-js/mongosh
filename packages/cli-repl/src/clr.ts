import ansi from 'ansi-escape-sequences';

export default function colorize(text: string, style: string|string[], options: { colors: boolean }): string {
  if (options.colors) {
    return ansi.format(text, style);
  }
  return text;
}

export function colorizeForStdout(text: string, style: string|string[]): string {
  return colorize(text, style, {
    colors: process.stdout.isTTY && process.stdout.getColorDepth() > 1 });
}

export function colorizeForStderr(text: string, style: string|string[]): string {
  return colorize(text, style, {
    colors: process.stderr.isTTY && process.stderr.getColorDepth() > 1 });
}
