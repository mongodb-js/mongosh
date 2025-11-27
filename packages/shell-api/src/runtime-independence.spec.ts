// This test verifies that shell-api only uses standard JS features.
import fsSync from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
import { expect } from 'chai';
import sinon from 'ts-sinon';

describe('Runtime independence', function () {
  it('Can run using exclusively JS standard features', async function () {
    const entryPoint = require.resolve('../');

    const context = vm.createContext(Object.create(null), {
      codeGeneration: {
        strings: false,
        wasm: false,
      },
    });

    // These are all used Node.js modules that are somewhat easily polyfill-able
    // for other environments, but which we should still ideally remove in the
    // long run (and definitely not add anything here).
    // Guaranteed bonusly for anyone who removes a package from this list!
    const allowedNodeBuiltins = ['events', 'path'];
    // Our TextDecoder/TextEncoder polyfills require this, unfortunately.
    context.Buffer = Buffer;

    // Small CJS implementation, without __dirname or __filename
    const cache = Object.create(null);
    const absolutePathRequire = (absolutePath: string) => {
      absolutePath = fsSync.realpathSync(absolutePath);
      if (cache[absolutePath]) return cache[absolutePath];
      const module = (cache[absolutePath] = { exports: {} });
      const localRequire = (specifier: string) => {
        if (allowedNodeBuiltins.includes(specifier)) return require(specifier);
        return absolutePathRequire(
          createRequire(absolutePath).resolve(specifier)
        ).exports;
      };
      const source = fsSync.readFileSync(absolutePath, 'utf8');
      const fn = vm.runInContext(
        `(function(module, exports, require) {\n${source}\n})`,
        context,
        {
          filename: `IN_CONTEXT:${absolutePath}`,
        }
      );
      fn(module, module.exports, localRequire);
      return module;
    };

    // service-provider-core injects a dummy polyfill for TextDecoder/TextEncoder
    absolutePathRequire(require.resolve('@mongosh/service-provider-core'));
    const shellApi =
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      absolutePathRequire(entryPoint).exports as typeof import('./');

    // Verify that `shellApi` is generally usable.
    const sp = {
      deepInspectWrappable: true,
      platform: 'CLI',
      close: sinon.spy(),
      bsonLibrary: absolutePathRequire(require.resolve('bson')).exports,
      getURI: sinon.stub().returns('mongodb://localhost:27017'),
      getFleOptions: sinon.stub().returns(undefined),
    };
    const evaluationListener = { onExit: sinon.spy() };
    const instanceState = new shellApi.ShellInstanceState(sp as any);
    instanceState.setEvaluationListener(evaluationListener);
    expect((instanceState.initialServiceProvider as any)._sp).to.equal(sp);
    const bsonObj = instanceState.shellBson.ISODate(
      '2025-01-09T20:43:51+01:00'
    );
    expect(bsonObj.toISOString()).to.equal('2025-01-09T19:43:51.000Z');
    expect(bsonObj instanceof Date).to.equal(false);
    expect(Object.prototype.toString.call(bsonObj)).to.equal(
      Object.prototype.toString.call(new Date())
    );

    try {
      await instanceState.shellApi.exit();
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.include('.onExit listener returned');
      expect(err.stack).to.include('IN_CONTEXT');
      expect(err instanceof Error).to.equal(false);
      expect(Object.prototype.toString.call(err)).to.equal(
        Object.prototype.toString.call(new Error())
      );
    }
    expect(sp.close).to.have.been.calledOnce;
    expect(evaluationListener.onExit).to.have.been.calledOnce;
  });
});
