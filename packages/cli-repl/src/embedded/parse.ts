import path from 'path';
import { promises as fs } from 'fs';

/**
 * Pure local-file parsing helpers for `mongosh --from`. Kept free of the
 * native engine import so the parser unit tests can run without the addon.
 */

/**
 * Derive a valid MongoDB collection name from a file path's stem.
 * `path/to/orders.csv` -> `orders`; `./my.data.json` -> `my.data`.
 */
export function collectionNameFromFile(file: string): string {
  const stem = path.basename(file, path.extname(file));
  const sanitized = stem.replace(/[$]/g, '_').replace(/^system\./, 'sys_');
  return sanitized || 'data';
}

/**
 * Parse a local data file into an array of documents.
 *
 * Supported formats (by extension):
 *  - `.csv`           header row + rows, values inferred as numbers/booleans/strings
 *  - `.json`          a single object or an array of objects
 *  - `.ndjson`/`.jsonl` one JSON object per line
 */
export async function parseFile(
  file: string
): Promise<Record<string, unknown>[]> {
  const contents = await fs.readFile(path.resolve(file), 'utf8');
  const ext = path.extname(file).toLowerCase();

  switch (ext) {
    case '.csv':
      return parseCsv(contents);
    case '.ndjson':
    case '.jsonl':
      return parseNdjson(contents);
    case '.json':
      return parseJson(contents);
    default:
      throw new Error(
        `Unsupported file format "${ext}" for --from. Supported formats: .csv, .json, .ndjson`
      );
  }
}

export function parseJson(contents: string): Record<string, unknown>[] {
  const value = JSON.parse(contents);
  if (Array.isArray(value)) {
    return value as Record<string, unknown>[];
  }
  if (value && typeof value === 'object') {
    return [value as Record<string, unknown>];
  }
  throw new Error(
    '--from JSON file must contain an object or an array of objects'
  );
}

export function parseNdjson(contents: string): Record<string, unknown>[] {
  const docs: Record<string, unknown>[] = [];
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const value = JSON.parse(trimmed);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('--from NDJSON lines must each be a JSON object');
    }
    docs.push(value as Record<string, unknown>);
  }
  return docs;
}

/** Parse a CSV string into documents, inferring numeric/boolean cell types. */
export function parseCsv(contents: string): Record<string, unknown>[] {
  const rows = parseCsvRows(contents);
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0];
  const docs: Record<string, unknown>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const doc: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      if (header) {
        doc[header] = inferCell(row[i]);
      }
    });
    docs.push(doc);
  }
  return docs;
}

function inferCell(raw: string | undefined): unknown {
  if (raw === undefined || raw === '') {
    return null;
  }
  const trimmed = raw.trim();
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Parse CSV rows, handling quoted fields (including embedded commas/newlines). */
export function parseCsvRows(contents: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const input = contents.replace(/^\uFEFF/, ''); // strip BOM

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') {
        i++;
      }
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Handle a trailing row without a final newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
