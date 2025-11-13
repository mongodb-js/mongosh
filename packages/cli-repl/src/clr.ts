import ansi from 'ansi-escape-sequences';

type MongoshStyle =
  | 'warning'
  | 'error'
  | 'section-header'
  | 'uri'
  | 'filename'
  | 'additional-error-info';
export type StyleDefinition =
  | Parameters<typeof ansi.format>[1]
  | `mongosh:${MongoshStyle}`;

/** Optionally colorize a string, given a set of style definition(s). */
export default function colorize(
  text: string,
  style: StyleDefinition | undefined,
  options: { colors: boolean }
): string {
  if (options.colors) {
    switch (style) {
      case 'mongosh:section-header':
      case 'mongosh:warning':
        style = ['bold', 'yellow'];
        break;
      case 'mongosh:error':
        style = ['bold', 'red'];
        break;
      case 'mongosh:filename':
        style = ['bold', 'blue'];
        break;
      case 'mongosh:uri':
        style = ['bold', 'green'];
        break;
      case 'mongosh:additional-error-info':
        style = ['yellow'];
        break;
      default:
        break;
    }
    return ansi.format(text, style);
  }
  return text;
}

/** Colorize a text with a given style, if stdout is a color-supporting TTY. */
function colorizeForStdout(text: string, style: StyleDefinition): string {
  return colorize(text, style, {
    colors: process.stdout.isTTY && process.stdout.getColorDepth() > 1,
  });
}

/** Colorize a text with a given style, if stderr is a color-supporting TTY. */
export function colorizeForStderr(
  text: string,
  style: StyleDefinition
): string {
  return colorize(text, style, {
    colors: process.stderr.isTTY && process.stderr.getColorDepth() > 1,
  });
}
