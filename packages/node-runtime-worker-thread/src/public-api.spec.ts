import * as chai from 'chai';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import type { RuntimeEvaluationListener } from '@mongosh/browser-runtime-core';
import type { MongoshBus } from '@mongosh/types';
import type {
  Caller,
  RPCMessageBus,
  WorkerThreadRuntime,
  WorkerRuntimeEvaluationListener,
} from '../dist/index';
import {
  createCaller,
  cancel,
  serializeConnectOptions,
  deserializeEvaluationResult,
  WorkerThreadEvaluationListener,
  WorkerProcessMongoshBus,
  workerRuntimePath,
} from '../dist/index';

chai.use(sinonChai);

function createMockRpcMessageBus(): RPCMessageBus {
  const ee = new EventEmitter();
  return {
    addEventListener: ee.on.bind(ee),
    removeEventListener: ee.off.bind(ee),
    postMessage: (data: unknown) => ee.emit('message', data),
  };
}

describe('public API', function () {
  let messageBus: RPCMessageBus;

  beforeEach(function () {
    messageBus = createMockRpcMessageBus();
  });

  it('exposes the worker script as a file on disk', function () {
    expect(path.isAbsolute(workerRuntimePath)).to.equal(true);
    expect(path.basename(workerRuntimePath)).to.equal('worker-runtime.js');
    expect(fs.statSync(workerRuntimePath).isFile()).to.equal(true);
  });

  it('resolves the worker script through the package exports', function () {
    expect(
      require.resolve('@mongosh/node-runtime-worker-thread/worker-runtime')
    ).to.equal(workerRuntimePath);
  });

  it('does not resolve deep imports into dist', function () {
    expect(() =>
      require.resolve('@mongosh/node-runtime-worker-thread/dist/rpc')
    )
      .to.throw()
      .with.property('code', 'ERR_PACKAGE_PATH_NOT_EXPORTED');
  });

  it('cancels in-flight calls of a caller', async function () {
    const caller: Caller<WorkerThreadRuntime, 'getShellPrompt'> =
      createCaller<WorkerThreadRuntime>(['getShellPrompt'], messageBus);
    const pending = caller.getShellPrompt().catch((e: unknown) => e);
    caller[cancel]();
    expect(await pending).to.have.property('isCanceled', true);
  });

  describe('WorkerThreadEvaluationListener', function () {
    let listener: WorkerThreadEvaluationListener;

    afterEach(function () {
      listener.terminate();
    });

    it('answers listener RPCs from any object with an evaluationListener', async function () {
      const onPrint = sinon.spy();
      const evaluationListener: RuntimeEvaluationListener = { onPrint };
      listener = new WorkerThreadEvaluationListener(
        { evaluationListener },
        messageBus
      );
      const caller = createCaller<Required<WorkerRuntimeEvaluationListener>>(
        ['onPrint'],
        messageBus
      );

      await caller.onPrint([{ type: null, printable: 42 }]);

      expect(onPrint).to.have.been.calledOnceWith([
        sinon.match({ type: null, printable: 42 }),
      ]);
    });
  });

  describe('WorkerProcessMongoshBus', function () {
    let bus: WorkerProcessMongoshBus;

    afterEach(function () {
      bus.terminate();
    });

    it('forwards emitted events to the emitter', async function () {
      const emit = sinon.spy();
      bus = new WorkerProcessMongoshBus(
        { emit } as unknown as MongoshBus,
        messageBus
      );
      const caller = createCaller<MongoshBus>(['emit'], messageBus);

      await caller.emit('mongosh:connect', {} as any);

      expect(emit).to.have.been.calledOnceWith('mongosh:connect', {});
    });
  });

  describe('serializer', function () {
    it('serializes connect options', function () {
      const options = { productName: 'Test', productDocsLink: 'x' };
      expect(serializeConnectOptions(options)).to.deep.equal(options);
    });

    it('deserializes error evaluation results', function () {
      const result = deserializeEvaluationResult({
        type: 'SerializedErrorResult',
        printable: { name: 'TypeError', message: 'oh no' },
      });
      expect(result.printable).to.be.instanceOf(Error);
      expect(result.printable).to.have.property('message', 'oh no');
    });
  });
});
