import { IframeRuntime } from './iframe-runtime';
import { expect } from '../../testing/chai';
import type { ServiceProvider } from '@mongosh/service-provider-core';
import * as bson from 'bson';

describe('IframeRuntime', function () {
  let runtime;
  let serviceProvider;

  beforeEach(function () {
    document.body.innerHTML = '';
    serviceProvider = { bsonLibrary: bson };
    runtime = new IframeRuntime(serviceProvider);
  });

  describe('#initialize', function () {
    it('adds an hidden sandboxed iframe to the document', async function () {
      expect(document.querySelector('iframe')).not.to.exist;

      await runtime.initialize();

      const iframe = document.querySelector('iframe');
      expect(iframe).to.exist;
      expect(iframe.style.display).to.equal('none');
      expect(iframe.sandbox.value).to.equal('allow-same-origin');
    });
  });

  describe('#destroy', function () {
    it('removes the iframe added by initialize', async function () {
      await runtime.initialize();
      expect(document.querySelector('iframe')).to.exist;

      await runtime.destroy();
      expect(document.querySelector('iframe')).not.to.exist;
    });

    it('does not throw if not initialized', async function () {
      await runtime.destroy();
    });
  });

  describe('#evaluate', function () {
    it('does not interfere with the parent window', async function () {
      await runtime.evaluate('x = 1');
      expect((window as any).x).not.to.equal(1);
    });

    it('does not interfere with other instances', async function () {
      const other = new IframeRuntime({ bsonLibrary: bson } as ServiceProvider);
      await runtime.evaluate('x = 1');
      await other.evaluate('x = 2');

      expect((await runtime.evaluate('x')).printable).to.equal(1);
    });
  });
});
