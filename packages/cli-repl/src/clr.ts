import ansi from 'ansi-escape-sequences';

export default function clr(text, style) {
  return process.stdout.isTTY ? ansi.format(text, style) : text;
}
