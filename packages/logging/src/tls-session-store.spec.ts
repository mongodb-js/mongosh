import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TlsSessionStore } from './tls-session-store';

describe('TlsSessionStore', function () {
  let dir: string;
  let filePath: string;

  beforeEach(function () {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tls-session-store-'));
    filePath = path.join(dir, 'sessions.json');
  });

  afterEach(function () {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('round-trip a session ticket through the file', async function () {
    const ticket = Buffer.from('fake-session-ticket');
    const writer = new TlsSessionStore(filePath);
    writer.set('telemetry.example.com', ticket);
    await writer.flush(); // set() persists asynchronously; flush awaits the write
    expect(fs.existsSync(filePath)).to.equal(true);

    const reader = new TlsSessionStore(filePath); // fresh instance = fresh process
    expect(reader.get('telemetry.example.com')).to.deep.equal(ticket);
    expect(reader.get('other.example.com')).to.equal(undefined);
  });

  it('expire tickets past the TTL', async function () {
    const writer = new TlsSessionStore(filePath, -1); // everything is expired
    writer.set('telemetry.example.com', Buffer.from('stale'));
    await writer.flush();

    const reader = new TlsSessionStore(filePath, -1);
    expect(reader.get('telemetry.example.com')).to.equal(undefined);
  });

  it('ignore a corrupted store file silently', function () {
    fs.writeFileSync(filePath, 'not json at all{{{');
    const store = new TlsSessionStore(filePath);
    expect(store.get('telemetry.example.com')).to.equal(undefined);
    store.set('telemetry.example.com', Buffer.from('recovered')); // must not throw
  });

  it('ignore a store file containing non-object JSON silently', function () {
    fs.writeFileSync(filePath, '42'); // valid JSON, wrong shape
    const store = new TlsSessionStore(filePath);
    expect(store.get('telemetry.example.com')).to.equal(undefined);
    store.set('telemetry.example.com', Buffer.from('recovered')); // must not throw
  });

  it('resolve flush() without a pending write', async function () {
    const store = new TlsSessionStore(filePath);
    await store.flush(); // must not throw or hang
  });

  it('restrict the store file permissions to the owner', async function () {
    if (process.platform === 'win32') return this.skip();
    const store = new TlsSessionStore(filePath);
    store.set('telemetry.example.com', Buffer.from('secret'));
    await store.flush();
    expect(fs.statSync(filePath).mode & 0o777).to.equal(0o600);
  });
});
