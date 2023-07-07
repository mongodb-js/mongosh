/** A parsed MongoDB log entry. */
export type LogEntry = {
  timestamp: string;
  severity: string;
  component: string;
  context: string;
  message: string;
  id: number | undefined;
  attr: any;
};

/**
 * Parse a log line from mongod < 4.4, i.e. before structured logging came into
 * existence. You may have seen code like this before. :)
 *
 * @param line The MongoDB logv1 line.
 * @returns The parsed line information.
 */
function parseOldLogEntry(line: string): LogEntry {
  const re =
    /^(?<timestamp>\S*) *(?<severity>\S*) *(?<component>\S*) *\[(?<context>[^\]]+)\]\s*(?<message>.*)$/;
  const match = re.exec(line.trim());
  if (!match) {
    throw new Error(`Could not parse line ${JSON.stringify(line)}`);
  }
  return match.groups as unknown as LogEntry;
}

/**
 * Parse a JSON (logv2) or legacy (logv1) log message.
 *
 * @param line The MongoDB log line.
 * @returns The parsed line information.
 */
export function parseAnyLogEntry(line: string): LogEntry {
  try {
    const newFormat = JSON.parse(line);
    return {
      id: newFormat.id,
      timestamp: newFormat.t?.$date,
      severity: newFormat.s,
      component: newFormat.c,
      context: newFormat.ctx,
      message: newFormat.msg,
      attr: newFormat.attr,
    };
  } catch {
    return parseOldLogEntry(line);
  }
}
