import ansi from 'ansi-escape-sequences';

export default function clr(text: string, style: string|string[], options: { colors: boolean }): string {
  if (options.colors) {
    return ansi.format(text, style);
  }
  return text;
}
