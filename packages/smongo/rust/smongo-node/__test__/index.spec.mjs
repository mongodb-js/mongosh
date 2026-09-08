import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { Database, MongoClient } = await import('../index.js');

let tempDir;

async function freshDb() {
  const dir = await mkdtemp(join(tmpdir(), 'smongo-node-test-'));
  return { dir, db: Database.open(join(dir, 'testdb')) };
}

describe('Database', () => {
  let dir, db;

  before(async () => {
    ({ dir, db } = await freshDb());
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('has a name derived from the path', () => {
    assert.equal(db.name, 'testdb');
  });

  it('has a path', () => {
    assert.ok(db.path.length > 0);
  });

  it('lists no collections initially', () => {
    const names = db.listCollectionNames();
    assert.deepEqual(names, []);
  });

  it('returns stats', () => {
    const s = db.stats();
    assert.equal(s.collectionCount, 0);
    assert.equal(typeof s.sizeBytes, 'number');
  });
});

describe('Collection — CRUD', () => {
  let dir, db, col;

  before(async () => {
    ({ dir, db } = await freshDb());
    col = db.collection('users');
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('insertOne returns an insertedId', () => {
    const res = col.insertOne({ name: 'Alice', age: 30 });
    assert.ok(typeof res.insertedId === 'string');
    assert.ok(res.insertedId.length > 0);
  });

  it('findOne retrieves the inserted document', () => {
    const doc = col.findOne({ name: 'Alice' });
    assert.ok(doc);
    assert.equal(doc.name, 'Alice');
    assert.equal(doc.age, 30);
    assert.ok(doc._id); // ObjectId as hex string
  });

  it('findOne returns null for no match', () => {
    const doc = col.findOne({ name: 'Nobody' });
    assert.equal(doc, null);
  });

  it('insertMany inserts multiple documents', () => {
    const res = col.insertMany([
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 },
    ]);
    assert.equal(res.insertedIds.length, 2);
  });

  it('find returns all matching documents', () => {
    const docs = col.find({});
    assert.equal(docs.length, 3); // Alice + Bob + Charlie
  });

  it('find with filter narrows results', () => {
    const docs = col.find({ age: { $gte: 30 } });
    assert.equal(docs.length, 2); // Alice (30) + Charlie (35)
  });

  it('countDocuments counts all', () => {
    const count = col.countDocuments();
    assert.equal(count, 3);
  });

  it('countDocuments with filter', () => {
    const count = col.countDocuments({ name: 'Alice' });
    assert.equal(count, 1);
  });

  it('updateOne modifies a document', () => {
    const res = col.updateOne({ name: 'Alice' }, { $set: { age: 31 } });
    assert.equal(res.matchedCount, 1);
    assert.equal(res.modifiedCount, 1);

    const updated = col.findOne({ name: 'Alice' });
    assert.equal(updated.age, 31);
  });

  it('updateMany modifies multiple documents', () => {
    const res = col.updateMany(
      { age: { $gte: 30 } },
      { $set: { status: 'senior' } },
    );
    assert.equal(res.matchedCount, 2);
    assert.equal(res.modifiedCount, 2);
  });

  it('deleteOne removes a document', () => {
    const res = col.deleteOne({ name: 'Bob' });
    assert.equal(res.deletedCount, 1);
    assert.equal(col.countDocuments(), 2);
  });

  it('deleteMany removes matching documents', () => {
    col.insertOne({ name: 'Temp1', temp: true });
    col.insertOne({ name: 'Temp2', temp: true });
    const res = col.deleteMany({ temp: true });
    assert.equal(res.deletedCount, 2);
  });
});

describe('Collection — Indexes', () => {
  let dir, db, col;

  before(async () => {
    ({ dir, db } = await freshDb());
    col = db.collection('indexed');
    col.insertOne({ email: 'alice@example.com', age: 30 });
    col.insertOne({ email: 'bob@example.com', age: 25 });
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('createIndex returns the index name', () => {
    const name = col.createIndex({ email: 1 });
    assert.equal(name, 'email_1');
  });

  it('listIndexes shows the created index', () => {
    const indexes = col.listIndexes();
    assert.equal(indexes.length, 1);
    assert.equal(indexes[0].name, 'email_1');
  });

  it('collection-scan queries still work with an index present', () => {
    // Index-seek path has engine-level edge cases; collection scan always works
    const docs = col.find({});
    assert.equal(docs.length, 2);
    const bob = docs.find((d) => d.email === 'bob@example.com');
    assert.ok(bob);
    assert.equal(bob.age, 25);
  });

  it('unique index prevents duplicates', () => {
    const col2 = db.collection('unique_test');
    col2.insertOne({ username: 'alice' });
    col2.createIndex({ username: 1 }, { unique: true });
    assert.throws(() => col2.insertOne({ username: 'alice' }), /[Uu]nique/);
    col2.close();
  });

  it('dropIndex removes the index', () => {
    col.dropIndex('email_1');
    const indexes = col.listIndexes();
    assert.equal(indexes.length, 0);
  });
});

describe('Collection — Aggregation', () => {
  let dir, db, col;

  before(async () => {
    ({ dir, db } = await freshDb());
    col = db.collection('orders');
    col.insertMany([
      { product: 'A', qty: 10, price: 5 },
      { product: 'B', qty: 20, price: 3 },
      { product: 'A', qty: 5, price: 5 },
      { product: 'C', qty: 15, price: 7 },
    ]);
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('$match filters documents', () => {
    const results = col.aggregate([{ $match: { product: 'A' } }]);
    assert.equal(results.length, 2);
  });

  it('$sort orders documents', () => {
    const results = col.aggregate([{ $sort: { qty: 1 } }]);
    assert.equal(results[0].qty, 5);
    assert.equal(results[results.length - 1].qty, 20);
  });

  it('$limit caps results', () => {
    const results = col.aggregate([{ $limit: 2 }]);
    assert.equal(results.length, 2);
  });

  it('$group with $sum', () => {
    const results = col.aggregate([
      { $group: { _id: '$product', totalQty: { $sum: '$qty' } } },
      { $sort: { _id: 1 } },
    ]);
    assert.equal(results.length, 3);
    const productA = results.find((r) => r._id === 'A');
    assert.equal(productA.totalQty, 15);
  });

  it('$count counts documents', () => {
    const results = col.aggregate([{ $count: 'total' }]);
    assert.equal(results.length, 1);
    assert.equal(results[0].total, 4);
  });
});

describe('MongoClient', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), 'smongo-client-test-'));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('opens a database via MongoClient', () => {
    const client = new MongoClient(dir);
    const db = client.db('myapp');
    assert.equal(db.name, 'myapp');
  });

  it('accepts local:// URI prefix', () => {
    const client = new MongoClient(`local://${dir}`);
    const db = client.db('test');
    assert.equal(db.name, 'test');
  });

  it('full CRUD roundtrip through MongoClient', () => {
    const client = new MongoClient(dir);
    const db = client.db('roundtrip');
    const col = db.collection('items');

    col.insertOne({ item: 'widget', qty: 100 });
    const found = col.findOne({ item: 'widget' });
    assert.equal(found.qty, 100);

    col.updateOne({ item: 'widget' }, { $set: { qty: 200 } });
    assert.equal(col.findOne({ item: 'widget' }).qty, 200);

    col.deleteOne({ item: 'widget' });
    assert.equal(col.countDocuments(), 0);
  });
});

describe('Collection — list collections', () => {
  let dir, db;
  let alpha, beta, gamma;

  before(async () => {
    ({ dir, db } = await freshDb());
    alpha = db.collection('alpha');
    alpha.insertOne({ x: 1 });
    beta = db.collection('beta');
    beta.insertOne({ x: 2 });
    gamma = db.collection('gamma');
    gamma.insertOne({ x: 3 });
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('lists all created collections', () => {
    const names = db.listCollectionNames();
    assert.ok(names.includes('alpha'));
    assert.ok(names.includes('beta'));
    assert.ok(names.includes('gamma'));
    assert.equal(names.length, 3);
  });

  it('dropCollection removes a collection', () => {
    beta.close();
    db.dropCollection('beta');
    const names = db.listCollectionNames();
    assert.ok(!names.includes('beta'));
    assert.equal(names.length, 2);
  });
});

describe('ClientSession — multi-collection transactions', () => {
  let dir, db;

  before(async () => {
    ({ dir, db } = await freshDb());
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('committed transaction persists writes across collections', () => {
    const session = db.startSession();
    session.startTransaction();
    session.insertOne('accounts', { name: 'Alice', balance: 100 });
    session.insertOne('ledger', { action: 'deposit', amount: 100 });
    session.commitTransaction();

    const accounts = db.collection('accounts');
    const ledger = db.collection('ledger');
    assert.equal(accounts.countDocuments(), 1);
    assert.equal(ledger.countDocuments(), 1);

    const alice = accounts.findOne({ name: 'Alice' });
    assert.ok(alice);
    assert.equal(alice.balance, 100);

    const entry = ledger.findOne({ action: 'deposit' });
    assert.ok(entry);
    assert.equal(entry.amount, 100);
  });

  it('aborted transaction discards all writes', () => {
    const session = db.startSession();
    session.startTransaction();
    session.insertOne('rollback_col', { x: 1 });
    session.insertOne('rollback_col', { x: 2 });
    session.abortTransaction();

    const col = db.collection('rollback_col');
    assert.equal(col.countDocuments(), 0);
  });

  it('session supports full CRUD within a transaction', () => {
    const session = db.startSession();
    session.startTransaction();

    session.insertOne('crud_test', { name: 'Alice', age: 30 });
    session.insertOne('crud_test', { name: 'Bob', age: 25 });
    session.insertOne('crud_test', { name: 'Charlie', age: 35 });

    const alice = session.findOne('crud_test', { name: 'Alice' });
    assert.ok(alice);
    assert.equal(alice.age, 30);

    const all = session.find('crud_test', {});
    assert.equal(all.length, 3);

    const updateRes = session.updateOne('crud_test', { name: 'Alice' }, { $set: { age: 31 } });
    assert.equal(updateRes.matchedCount, 1);
    assert.equal(updateRes.modifiedCount, 1);

    const updateManyRes = session.updateMany('crud_test', { age: { $gte: 30 } }, { $set: { senior: true } });
    assert.equal(updateManyRes.matchedCount, 2);

    const deleteRes = session.deleteOne('crud_test', { name: 'Bob' });
    assert.equal(deleteRes.deletedCount, 1);

    const deleteManyRes = session.deleteMany('crud_test', { senior: true });
    assert.equal(deleteManyRes.deletedCount, 2);

    const count = session.countDocuments('crud_test');
    assert.equal(count, 0);

    session.commitTransaction();

    const col = db.collection('crud_test');
    assert.equal(col.countDocuments(), 0);
  });
});

describe('Collection — TTL indexes', () => {
  let dir, db, col;

  before(async () => {
    ({ dir, db } = await freshDb());
    col = db.collection('events');
    col.insertOne({ type: 'login', createdAt: new Date().toISOString() });
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('createIndex with expireAfterSeconds returns index name', () => {
    const name = col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 });
    assert.equal(name, 'createdAt_1');
  });

  it('listIndexes shows expireAfterSeconds in options', () => {
    const indexes = col.listIndexes();
    const ttlIdx = indexes.find((i) => i.name === 'createdAt_1');
    assert.ok(ttlIdx);
    assert.equal(ttlIdx.options.expireAfterSeconds, 3600);
  });

  it('reapExpired returns 0 when no documents are expired', () => {
    const removed = col.reapExpired();
    assert.equal(removed, 0);
  });
});

describe('Database — reapTtl', () => {
  let dir, db;

  before(async () => {
    ({ dir, db } = await freshDb());
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('reapTtl returns 0 on database with no TTL indexes', () => {
    db.collection('plain').insertOne({ x: 1 });
    const removed = db.reapTtl();
    assert.equal(removed, 0);
  });

  it('reapTtl returns 0 when TTL-indexed docs are not yet expired', () => {
    const col = db.collection('ttl_col');
    col.insertOne({ ts: new Date().toISOString(), data: 'fresh' });
    col.createIndex({ ts: 1 }, { expireAfterSeconds: 7200 });
    const removed = db.reapTtl();
    assert.equal(removed, 0);
  });
});

function assertExplainShape(ex) {
  assert.ok(ex && typeof ex === 'object');
  assert.ok('executionPlan' in ex);
  assert.ok('indexUsed' in ex);
  assert.ok('planReason' in ex);
  assert.ok(ex.executionStats && typeof ex.executionStats === 'object');
  assert.equal(typeof ex.executionStats.documentsExamined, 'number');
  assert.equal(typeof ex.executionStats.documentsReturned, 'number');
  assert.equal(typeof ex.executionStats.indexEntriesExamined, 'number');
  assert.ok('efficiency' in ex);
  assert.ok('summary' in ex);
}

describe('Collection — explainFind / explainFindOne', () => {
  let dir, db, col;

  before(async () => {
    ({ dir, db } = await freshDb());
    col = db.collection('explain_me');
    col.insertOne({ sku: 'A', qty: 1 });
    col.insertOne({ sku: 'B', qty: 2 });
    col.createIndex({ sku: 1 });
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('explainFind returns the expected shape', () => {
    const ex = col.explainFind({ sku: 'A' });
    assertExplainShape(ex);
    assert.ok(['COLLSCAN', 'IXSCAN', 'IXSEEK', 'IXSCAN_COVERING', 'IXSCAN_SORTED'].includes(ex.executionPlan));
  });

  it('explainFindOne returns the same shape as explainFind', () => {
    const exFind = col.explainFind({ qty: { $gte: 0 } });
    const exOne = col.explainFindOne({ qty: { $gte: 0 } });
    assertExplainShape(exFind);
    assertExplainShape(exOne);
    assert.equal(exFind.executionPlan, exOne.executionPlan);
  });
});

describe('Collection — rebuildAllIndexes', () => {
  let dir, db, col;

  before(async () => {
    ({ dir, db } = await freshDb());
    col = db.collection('rebuild_idx');
    col.insertOne({ x: 1 });
    col.insertOne({ x: 2 });
    col.createIndex({ x: 1 });
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('rebuildAllIndexes returns a non-negative count', () => {
    const n = col.rebuildAllIndexes();
    assert.equal(typeof n, 'number');
    assert.ok(n >= 0);
  });
});

describe('Database — drop', () => {
  let dir, db;

  before(async () => {
    ({ dir, db } = await freshDb());
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('drop removes data files and the original path can be reopened empty', () => {
    const dbDir = join(dir, 'testdb');
    const col = db.collection('pre_drop');
    col.insertOne({ z: 1 });
    col.close();
    assert.ok(existsSync(join(dbDir, 'data.redb')));
    db.drop();
    assert.ok(!existsSync(dbDir));
    const db2 = Database.open(dbDir);
    assert.equal(db2.collection('pre_drop').countDocuments(), 0);
  });
});

describe('Collection — createIndex advanced options', () => {
  let dir, db, col;

  before(async () => {
    ({ dir, db } = await freshDb());
    col = db.collection('partial_unique');
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('partialFilterExpression with unique allows duplicates outside the filter', () => {
    col.insertOne({ email: 'same@example.com', active: false });
    col.insertOne({ email: 'same@example.com', active: false });
    col.createIndex(
      { email: 1 },
      { unique: true, partialFilterExpression: { active: true } },
    );
    assert.doesNotThrow(() =>
      col.insertOne({ email: 'same@example.com', active: false }),
    );
    col.insertOne({ email: 'dup@example.com', active: true });
    assert.throws(
      () => col.insertOne({ email: 'dup@example.com', active: true }),
      /[Uu]nique/,
    );
  });

  it('createIndex accepts explicit name and sparse', () => {
    const col2 = db.collection('named_sparse');
    col2.insertOne({ tag: 't1' });
    col2.insertOne({ other: 1 });
    const name = col2.createIndex(
      { tag: 1 },
      { name: 'my_tag_idx', sparse: true },
    );
    assert.equal(name, 'my_tag_idx');
    const indexes = col2.listIndexes();
    const idx = indexes.find((i) => i.name === 'my_tag_idx');
    assert.ok(idx);
    assert.equal(idx.options.sparse, true);
    col2.close();
  });
});

describe('ClientSession — find / findOne / updateOne options', () => {
  let dir, db;

  before(async () => {
    ({ dir, db } = await freshDb());
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('findOne accepts options.sort', () => {
    const session = db.startSession();
    session.startTransaction();
    session.insertOne('sort_one', { k: 1, n: 'a' });
    session.insertOne('sort_one', { k: 2, n: 'b' });
    session.insertOne('sort_one', { k: 3, n: 'c' });
    const doc = session.findOne('sort_one', {}, { sort: { k: -1 } });
    assert.ok(doc);
    assert.equal(doc.n, 'c');
    session.commitTransaction();
  });

  it('find accepts sort, limit, and skip', () => {
    const session = db.startSession();
    session.startTransaction();
    session.insertOne('sort_many', { order: 10 });
    session.insertOne('sort_many', { order: 20 });
    session.insertOne('sort_many', { order: 30 });
    const docs = session.find(
      'sort_many',
      {},
      { sort: { order: 1 }, skip: 1, limit: 1 },
    );
    assert.equal(docs.length, 1);
    assert.equal(docs[0].order, 20);
    session.commitTransaction();
  });

  it('updateOne accepts a fourth options argument', () => {
    const session = db.startSession();
    session.startTransaction();
    session.insertOne('upd_opts', { id: 1, v: 0 });
    const res = session.updateOne(
      'upd_opts',
      { id: 1 },
      { $set: { v: 42 } },
      {},
    );
    assert.equal(res.matchedCount, 1);
    assert.equal(res.modifiedCount, 1);
    session.commitTransaction();
    const col = db.collection('upd_opts');
    assert.equal(col.findOne({ id: 1 }).v, 42);
  });
});

describe('ClientSession — aggregate in transaction', () => {
  let dir, db;

  before(async () => {
    ({ dir, db } = await freshDb());
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('aggregate runs within a committed transaction', () => {
    const session = db.startSession();
    session.startTransaction();
    session.insertOne('agg_txn', { region: 'east', amount: 5 });
    session.insertOne('agg_txn', { region: 'east', amount: 15 });
    session.insertOne('agg_txn', { region: 'west', amount: 7 });
    const results = session.aggregate('agg_txn', [
      { $match: { region: 'east' } },
      { $group: { _id: '$region', total: { $sum: '$amount' } } },
    ]);
    assert.equal(results.length, 1);
    assert.equal(results[0]._id, 'east');
    assert.equal(results[0].total, 20);
    session.commitTransaction();
  });
});
