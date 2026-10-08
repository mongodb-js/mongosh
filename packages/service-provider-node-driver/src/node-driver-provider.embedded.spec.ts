import { expect } from 'chai';
import { EventEmitter } from 'events';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ConnectionString from 'mongodb-connection-string-url';
import { NodeDriverServiceProvider } from './node-driver-service-provider';
import { dummyOptions } from './node-driver-service-provider.spec';

/**
 * The URI the arg parser produces for `mongodb_embedded://<directory>`.
 */
function embeddedUri(directory: string): string {
  const connectionString = new ConnectionString(
    'mongodb://embedded/?directConnection=true'
  );
  connectionString.searchParams.set('embeddedMongodb', directory);
  return connectionString.toString();
}

describe('NodeDriverServiceProvider [embedded]', function () {
  this.timeout(120_000);

  let directory: string;

  beforeEach(function () {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mongosh-embedded-'));
  });

  afterEach(function () {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('opens the directory and serves commands over it', async function () {
    const serviceProvider = await NodeDriverServiceProvider.connect(
      embeddedUri(directory),
      dummyOptions,
      {},
      new EventEmitter()
    );
    try {
      expect(
        (await serviceProvider.runCommand('admin', { ping: 1 })).ok
      ).to.equal(1);
      const { insertedId } = await serviceProvider.insertOne('app', 'items', {
        name: 'embedded',
      });
      expect(
        await serviceProvider.find('app', 'items', {}).toArray()
      ).to.deep.equal([{ _id: insertedId, name: 'embedded' }]);
    } finally {
      await serviceProvider.close();
    }
  });

  it('reports the engine through getConnectionInfo', async function () {
    const serviceProvider = await NodeDriverServiceProvider.connect(
      embeddedUri(directory),
      dummyOptions,
      {},
      new EventEmitter()
    );
    try {
      const info = await serviceProvider.getConnectionInfo();
      expect(info.buildInfo?.modules).to.include('embedded');
      expect(info.extraInfo?.fcv).to.be.a('string');
    } finally {
      await serviceProvider.close();
    }
  });

  it('keeps the data for the next connection and releases the engine on close', async function () {
    let serviceProvider = await NodeDriverServiceProvider.connect(
      embeddedUri(directory),
      dummyOptions,
      {},
      new EventEmitter()
    );
    await serviceProvider.insertOne('app', 'items', { _id: 'kept' });
    await serviceProvider.close();

    // Only one engine may be open per process, so this reopen is also the proof that close
    // released it.
    serviceProvider = await NodeDriverServiceProvider.connect(
      embeddedUri(directory),
      dummyOptions,
      {},
      new EventEmitter()
    );
    try {
      expect(
        await serviceProvider.find('app', 'items', {}).toArray()
      ).to.deep.equal([{ _id: 'kept' }]);
    } finally {
      await serviceProvider.close();
    }
  });

  it('releases the engine when the connection fails', async function () {
    // A pool size the driver refuses, after the engine has been opened for it.
    const failing = new ConnectionString(embeddedUri(directory));
    failing.searchParams.set('maxPoolSize', 'not-a-number');
    let error: Error | undefined;
    try {
      await NodeDriverServiceProvider.connect(
        failing.toString(),
        dummyOptions,
        {},
        new EventEmitter()
      );
    } catch (err: any) {
      error = err;
    }
    expect(error).to.be.instanceOf(Error);

    const serviceProvider = await NodeDriverServiceProvider.connect(
      embeddedUri(directory),
      dummyOptions,
      {},
      new EventEmitter()
    );
    await serviceProvider.close();
  });
});
