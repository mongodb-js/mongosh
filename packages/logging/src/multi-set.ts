/**
 * A helper class for keeping track of how often specific events occurred.
 */
export class MultiSet<T extends Record<string, unknown>> {
  _entries: Map<string, number> = new Map();

  add(entry: T): void {
    const key = JSON.stringify(Object.entries(entry).sort());
    this._entries.set(key, (this._entries.get(key) ?? 0) + 1);
  }

  clear(): void {
    this._entries.clear();
  }

  *[Symbol.iterator](): Iterator<[T, number]> {
    for (const [key, count] of this._entries) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      yield [Object.fromEntries(JSON.parse(key)) as T, count];
    }
  }
}

/**
 * It transforms a random string into snake case. Snake case is completely
 * lowercase and uses '_' to separate words. For example:
 *
 * This function defines a "word" as a sequence of characters until the next `.` or capital letter.
 *
 * 'Random String' => 'random_string'
 *
 * It will also remove any non alphanumeric characters to ensure the string
 * is compatible with Segment. For example:
 *
 * 'Node.js REPL Instantiation' => 'node_js_repl_instantiation'
 *
 * @param str Any non snake-case formatted string
 * @returns The snake-case formatted string
 */
export function toSnakeCase(str: string): string {
  const matches = str.match(
    /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
  );
  if (!matches) {
    return str;
  }

  return matches.map((x) => x.toLowerCase()).join('_');
}
