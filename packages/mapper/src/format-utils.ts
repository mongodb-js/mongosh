import textTable from 'text-table';
import prettyBytes from 'pretty-bytes';

export function formatTable(rows: string[][]): string {
  return textTable(rows);
}

export function formatBytes(bytes: number): string {
  return prettyBytes(bytes);
}
