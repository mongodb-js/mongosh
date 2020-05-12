import sinon, { SinonStubbedInstance } from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
const { expect } = chai;

import { CliServiceProvider } from '@mongosh/service-provider-server';
import { ElectronRuntime } from './electron-runtime';
import { EventEmitter } from 'events';

describe('Electron runtime', function() {
  let serviceProvider: SinonStubbedInstance<CliServiceProvider>;
  let messageBus: SinonStubbedInstance<EventEmitter>;
  let electronRuntime: ElectronRuntime;

  beforeEach(async() => {
    serviceProvider = sinon.createStubInstance(CliServiceProvider);
    messageBus = sinon.createStubInstance(EventEmitter);
    electronRuntime = new ElectronRuntime(serviceProvider, messageBus);
  });

  it('can evaluate simple js', async() => {
    const result = await electronRuntime.evaluate('2 + 2');
    expect(result.value).to.equal(4);
  });

  it('can run help', async() => {
    const result = await electronRuntime.evaluate('help');
    expect(result.shellApiType).to.equal('Help');
  });

  it('can run show', async() => {
    serviceProvider.listDatabases.resolves({
      databases: []
    });

    const result = await electronRuntime.evaluate('show dbs');
    expect(result.shellApiType).to.equal('ShowDatabasesResult');
  });

  it('can switch database', async() => {
    expect(
      (await electronRuntime.evaluate('db')).value
    ).not.to.equal('db1');

    await electronRuntime.evaluate('use db1');

    expect(
      (await electronRuntime.evaluate('db')).value
    ).to.equal('db1');
  });

  it('allows to receive telemetry event passing a message bus', async() => {
    await electronRuntime.evaluate('use db1');
    expect(messageBus.emit).to.have.been.calledWith('mongosh:use');
  });
});
