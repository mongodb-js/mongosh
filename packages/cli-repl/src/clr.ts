import ansi from 'ansi-escape-sequences';

export default function clr(text: string, style: any): string {
  return process.stdout.isTTY ? ansi.format(text, style) : text;
}
