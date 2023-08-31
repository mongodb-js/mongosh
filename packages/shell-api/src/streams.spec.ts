import { expect } from 'chai';
import sinon from 'sinon';

import type Mongo from './mongo';
import Database from './database';
import { Streams } from './streams';
import { InterruptFlag, MongoshInterruptedError } from './interruptor';

describe('Streams', function () {
  let mongo: Mongo;
  let streams: Streams;
  const identity = (a: unknown) => a;

  beforeEach(function () {
    mongo = {
      _instanceState: {
        interrupted: new InterruptFlag(),
        shellApi: { printjson: identity },
        transformError: identity,
      },
      _serviceProvider: {
        runCommand: identity,
      },
    } as unknown as Mongo;
    streams = new Streams(new Database(mongo, 'testDb'));
  });

  describe('createStreamProcessor', function () {
    it('throws when name is empty', async function () {
      const caught = await streams
        .createStreamProcessor('', [])
        .catch((e) => e);
      expect(caught.message).to.contain(
        '[COMMON-10001] Invalid processor name'
      );
    });

    it('throws when pipeline is empty', async function () {
      const caught = await streams
        .createStreamProcessor('spm', [])
        .catch((e) => e);
      expect(caught.message).to.contain('[COMMON-10001] Invalid pipeline');
    });

    it('returns error when creation fails', async function () {
      const error = { ok: Date.now() };
      sinon.stub(mongo._serviceProvider, 'runCommand').resolves(error);

      const pipeline = [{ $match: { foo: 'bar' } }];
      const result = await streams.createStreamProcessor('spm', pipeline);
      expect(result).to.eql(error);
    });

    it('returns newly created processor', async function () {
      const runCmdStub = sinon
        .stub(mongo._serviceProvider, 'runCommand')
        .resolves({ ok: 1 });

      const pipeline = [{ $match: { foo: 'bar' } }];
      const result = await streams.createStreamProcessor('spm', pipeline);
      expect(result).to.eql(streams.getProcessor('spm'));

      const cmd = { createStreamProcessor: 'spm', pipeline };
      expect(runCmdStub.calledOnceWithExactly('admin', cmd, {})).to.be.true;
    });
  });

  describe('process', function () {
    it('throws when pipeline is empty', async function () {
      const caught = await streams.process([]).catch((e) => e);
      expect(caught.message).to.contain('[COMMON-10001] Invalid pipeline');
    });

    it('returns if process cmd errors', async function () {
      const error = { ok: Date.now() };
      sinon.stub(mongo._serviceProvider, 'runCommand').resolves(error);

      const pipeline = [{ $match: { foo: 'bar' } }];
      const result = await streams.process(pipeline);
      expect(result).to.eql(error);
    });

    it('prints received sample documents until the end', async function () {
      const pipeline = [{ $match: { foo: 'bar' } }];
      const spmName = 'testSpm';
      const cursorId = Date.now();

      const runCmdStub = sinon.stub(mongo._serviceProvider, 'runCommand');
      runCmdStub
        .withArgs('admin', { processStreamProcessor: pipeline }, {})
        .resolves({ ok: 1, name: spmName, cursorId });
      runCmdStub
        .withArgs(
          'admin',
          { getMoreSampleStreamProcessor: spmName, cursorId },
          {}
        )
        .resolves({
          ok: 1,
          messages: [{ msg: '1st' }],
          cursorId: cursorId - 1,
        });
      runCmdStub
        .withArgs(
          'admin',
          { getMoreSampleStreamProcessor: spmName, cursorId: cursorId - 1 },
          {}
        )
        .resolves({ ok: 1, messages: [{ msg: '2nd' }], cursorId: 0 });

      const printSub = sinon.stub(mongo._instanceState.shellApi, 'printjson');

      await streams.process(pipeline);

      expect(printSub.firstCall.args).to.eql([{ msg: '1st' }]);
      expect(printSub.secondCall.args).to.eql([{ msg: '2nd' }]);
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          { dropStreamProcessor: spmName },
          {}
        )
      ).to.be.true;
    });

    it('drops the processor and then stops on interruption', async function () {
      const pipeline = [{ $match: { foo: 'bar' } }];
      const spmName = 'testSpm';
      const cursorId = Date.now();

      let getMoreResolve;
      const getMoreCalled = new Promise((r) => (getMoreResolve = r));

      const runCmdStub = sinon.stub(mongo._serviceProvider, 'runCommand');
      runCmdStub
        .withArgs('admin', { processStreamProcessor: pipeline }, {})
        .resolves({ ok: 1, name: spmName, cursorId });
      runCmdStub
        .withArgs(
          'admin',
          { getMoreSampleStreamProcessor: spmName, cursorId },
          {}
        )
        .callsFake(() => {
          getMoreResolve();
          return new Promise(identity);
        });

      const processPromise = streams.process(pipeline).catch((e) => e);

      await getMoreCalled;

      await mongo._instanceState.interrupted.set();

      expect(await processPromise).to.be.instanceOf(MongoshInterruptedError);
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          { dropStreamProcessor: spmName },
          {}
        )
      ).to.be.true;
    });
  });
});
