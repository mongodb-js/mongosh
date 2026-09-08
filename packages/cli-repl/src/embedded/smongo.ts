import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { MongoClient } from 'mongodb';
import { WireServer } from '@mongosh/smongo';
import { collectionNameFromFile, parseFile } from './parse';

/**
 * The default database used for the embedded `--from` session.
 */
export const EMBEDDED_DB_NAME = 'local';

const INGEST_BATCH_SIZE = 1000;

/**
 * A running embedded engine backed by the vendored smongo native addon.
 */
export interface EmbeddedEngine {
  /** The connection string the shell's driver should connect to. */
  uri: string;
  /** The database name queries run against (e.g. `db.data`). */
  dbName: string;
  /** Stop the engine and clean up its temporary data directory. */
  stop: () => Promise<void>;
}

/**
 * Start an in-process embedded engine (smongo wire server) on an ephemeral
 * localhost port, backed by a throwaway temporary data directory.
 */
export async function startEmbeddedEngine(): Promise<EmbeddedEngine> {
  const dbPath = await fs.mkdtemp(path.join(os.tmpdir(), 'mongosh-from-'));
  const server = new WireServer({ dbPath, port: 0 });
  const port = server.start();
  return {
    uri: `mongodb://127.0.0.1:${port}/${EMBEDDED_DB_NAME}`,
    dbName: EMBEDDED_DB_NAME,
    stop: async () => {
      server.stop();
      await fs.rm(dbPath, { recursive: true, force: true });
    },
  };
}

/**
 * Ingest `--from` files into the embedded engine, each into the collection
 * derived from its file stem (e.g. `data.csv` -> `db.data`).
 *
 * The engine is a single-file store that only one handle may open at a time
 * (the wire server holds it), so ingestion goes over the wire protocol through
 * a short-lived driver connection to the same URI the shell uses.
 */
export async function ingestFiles(
  files: string[],
  uri: string,
  dbName: string
): Promise<void> {
  const client = new MongoClient(uri, {
    directConnection: true,
    serverSelectionTimeoutMS: 3000,
  });
  await client.connect();
  try {
    const db = client.db(dbName);
    for (const file of files) {
      const collectionName = collectionNameFromFile(file);
      const docs = await parseFile(file);
      const collection = db.collection(collectionName);
      for (let i = 0; i < docs.length; i += INGEST_BATCH_SIZE) {
        const batch = docs.slice(i, i + INGEST_BATCH_SIZE);
        await collection.insertMany(batch, { ordered: false });
      }
    }
  } finally {
    await client.close();
  }
}
