import { expect } from 'chai';
import importNodeFetch from './';

describe('import-node-fetch', function () {
  it('Fails to import node-fetch normally', async function () {
    let failed = false;
    try {
      await import('node-fetch');
    } catch (error) {
      failed = true;
      expect((error as Error).message).to.include('require() of ES Module');
    }
    if (!failed) throw new Error('This was expected to fail');
  });

  it('Imports node-fetch safely', async function () {
    const fetch = await importNodeFetch();

    expect(fetch).to.exist;
    expect(fetch).to.haveOwnProperty('default');
    expect(fetch.default).to.be.a('function');
  });
});
