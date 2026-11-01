import { EventEmitter } from 'events';
import * as chai from 'chai';
import { expect } from 'chai';
import type { MongoClient } from 'mongodb';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import ConnectionString from 'mongodb-connection-string-url';
import {
  NodeDriverServiceProvider,
  type DevtoolsConnectOptions,
} from './node-driver-service-provider';

chai.use(sinonChai);

const dummyOptions: DevtoolsConnectOptions = Object.freeze({
  productName: 'Test Product',
  productDocsLink: 'https://example.com/',
});

function clientStub(): MongoClient & { close: sinon.SinonStub } {
  return {
    close: sinon.stub().resolves(),
    options: {},
  } as unknown as MongoClient & { close: sinon.SinonStub };
}

describe('NodeDriverServiceProvider.resetConnectionOptions', function () {
  let connectMongoClient: sinon.SinonStub;

  beforeEach(function () {
    connectMongoClient = sinon.stub(
      NodeDriverServiceProvider as any,
      'connectMongoClient'
    );
  });

  afterEach(function () {
    connectMongoClient.restore();
  });

  function createProvider(client: MongoClient): NodeDriverServiceProvider {
    return new NodeDriverServiceProvider(
      client,
      new EventEmitter(),
      { ...dummyOptions },
      new ConnectionString('mongodb://127.0.0.1:27017/test')
    );
  }

  it('retries a failed close once and then uses the new client', async function () {
    const previous = clientStub();
    previous.close.onFirstCall().rejects(new Error('cursor close failed'));
    const replacement = clientStub();
    connectMongoClient.resolves({
      client: replacement,
      state: { id: 'next' },
      lastSeenTopology: undefined,
    });
    const provider = createProvider(previous);

    await provider.resetConnectionOptions({
      readPreference: 'secondaryPreferred',
    });

    expect(previous.close).to.have.been.calledTwice;
    expect(replacement.close).to.not.have.been.called;
    expect(provider.mongoClient).to.equal(replacement);
  });

  it('keeps the previous client when close keeps failing', async function () {
    const previous = clientStub();
    previous.close.rejects(new Error('cursor close failed'));
    const replacement = clientStub();
    connectMongoClient.resolves({
      client: replacement,
      state: { id: 'next' },
      lastSeenTopology: undefined,
    });
    const provider = createProvider(previous);

    try {
      await provider.resetConnectionOptions({
        readPreference: 'secondaryPreferred',
      });
      expect.fail('resetConnectionOptions should surface the close error');
    } catch (err: any) {
      expect(err.message).to.equal('cursor close failed');
    }

    expect(previous.close).to.have.been.calledTwice;
    expect(replacement.close).to.have.been.calledOnce;
    expect(provider.mongoClient).to.equal(previous);
    expect((provider as any).currentClientOptions.readPreference).to.equal(
      undefined
    );
  });

  it('closes a replacement client later when that close fails too', async function () {
    const previous = clientStub();
    previous.close.rejects(new Error('cursor close failed'));
    const replacement = clientStub();
    replacement.close.onCall(0).rejects(new Error('replacement close failed'));
    replacement.close.onCall(1).rejects(new Error('replacement close failed'));
    connectMongoClient.resolves({
      client: replacement,
      state: { id: 'next' },
      lastSeenTopology: undefined,
    });
    const provider = createProvider(previous);

    try {
      await provider.resetConnectionOptions({});
      expect.fail('resetConnectionOptions should surface the close error');
    } catch (err: any) {
      expect(err.message).to.equal('cursor close failed');
    }
    expect(provider.mongoClient).to.equal(previous);
    expect((provider as any).clientsAwaitingClose).to.deep.equal([replacement]);

    previous.close.resetHistory();
    previous.close.resetBehavior();
    previous.close.resolves();
    replacement.close.resetHistory();
    replacement.close.resetBehavior();
    replacement.close.resolves();
    await provider.close();

    expect(previous.close).to.have.been.calledOnce;
    expect(replacement.close).to.have.been.calledOnce;
    expect((provider as any).clientsAwaitingClose).to.deep.equal([]);
  });
});
