import { expect } from 'chai';
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';

// The integration test exercises the vendored native addon. If the addon was
// not built in this checkout, fall back to skipping so the pure-JS parser
// tests (and the rest of the suite) still run.
let api: {
  startEmbeddedEngine: () => Promise<any>;
  ingestFiles: (files: string[], uri: string, dbName: string) => Promise<void>;
};
let nativeAvailable = true;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  api = require('./smongo');
} catch (e) {
  nativeAvailable = false;
}

describe('embedded smongo engine (native)', function () {
  const test = nativeAvailable ? it : it.skip;

  let dir: string;
  let csvPath: string;
  let client: any;
  let engine: any;

  beforeEach(async function () {
    if (!nativeAvailable) return;
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mongosh-spec-'));
    csvPath = path.join(dir, 'people.csv');
    await fs.writeFile(csvPath, 'name,age,city\nAlice,34,NYC\nBob,41,LA\n');
    engine = await api.startEmbeddedEngine();
    const { MongoClient } = require('mongodb');
    client = new MongoClient(engine.uri, { directConnection: true });
  });

  afterEach(async function () {
    if (!nativeAvailable) return;
    if (client) await client.close();
    await engine.stop();
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('ingests a CSV into a collection named after the file stem', async function () {
    await api.ingestFiles([csvPath], engine.uri, engine.dbName);
    const coll = client.db(engine.dbName).collection('people');
    const docs = await coll.find({}).toArray();
    expect(docs).to.have.length(2);
    expect(docs.map((d: any) => d.name).sort()).to.deep.equal(['Alice', 'Bob']);
    expect(docs[0].age).to.equal(34);
  });

  test('supports aggregation over ingested data', async function () {
    await api.ingestFiles([csvPath], engine.uri, engine.dbName);
    const coll = client.db(engine.dbName).collection('people');
    const agg = await coll
      .aggregate([{ $group: { _id: '$city', count: { $sum: 1 } } }])
      .toArray();
    const byCity = Object.fromEntries(agg.map((r: any) => [r._id, r.count]));
    expect(byCity).to.deep.equal({ NYC: 1, LA: 1 });
  });
});
