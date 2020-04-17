import { expect } from 'chai';
import sinon from 'sinon';

import { CliServiceProvider } from '@mongosh/service-provider-server';
import { ElectronRuntime } from './electron-runtime';

describe('Electron runtime', function() {
  let serviceProvider: CliServiceProvider;
  let electronRuntime: ElectronRuntime;

  beforeEach(async() => {
    serviceProvider = sinon.createStubInstance(CliServiceProvider);
    electronRuntime = new ElectronRuntime(serviceProvider);
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
    (serviceProvider.listDatabases as sinon.Stub).resolves({
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
});
