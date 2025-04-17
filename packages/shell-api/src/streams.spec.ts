import { expect } from 'chai';
import sinon from 'sinon';

import type Mongo from './mongo';
import { DatabaseImpl } from './database';
import { Streams } from './streams';
import { InterruptFlag, MongoshInterruptedError } from './interruptor';
import type { MongoshInvalidInputError } from '@mongosh/errors';

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
    const db = new DatabaseImpl(mongo, 'testDb');
    streams = new Streams(db._typeLaunder());
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

      let getMoreResolve: () => void;
      const getMoreCalled = new Promise<void>((r) => (getMoreResolve = r));

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

  // Create a stream processor.
  const createProcessor = async (name: string) => {
    const runCmdStub = sinon
      .stub(mongo._serviceProvider, 'runCommand')
      .resolves({ ok: 1 });
    const pipeline = [{ $match: { foo: 'bar' } }];
    const processor = await streams.createStreamProcessor(name, pipeline);
    expect(processor).to.eql(streams.getProcessor(name));
    const cmd = { createStreamProcessor: name, pipeline };
    expect(runCmdStub.calledOnceWithExactly('admin', cmd, {})).to.be.true;
    return { runCmdStub, processor };
  };

  // Validate supplying options in start,stop, and drop commands.
  describe('options', function () {
    it('supplies options in start, stop, and drop', async function () {
      const name = 'testOptions';
      const { runCmdStub, processor } = await createProcessor(name);

      // Start the stream processor with an extra option.
      await processor.start({ resumeFromCheckpoint: false });
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          { startStreamProcessor: name, resumeFromCheckpoint: false },
          {}
        )
      ).to.be.true;

      // Stop the stream processor with an extra option.
      await processor.stop({ force: true });
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          { stopStreamProcessor: name, force: true },
          {}
        )
      ).to.be.true;

      // Drop the stream processor with a few extra options.
      const opts = {
        force: true,
        ttl: { unit: 'day', size: 30 },
      };
      await processor.drop(opts);
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          {
            dropStreamProcessor: name,
            ...opts,
          },
          {}
        )
      ).to.be.true;
    });
  });

  describe('modify', function () {
    it('throws with invalid parameters', async function () {
      const { processor } = await createProcessor('testModify');

      // No arguments to modify.
      const caught = await processor
        .modify()
        .catch((e: MongoshInvalidInputError) => e);
      expect(caught.message).to.contain(
        '[COMMON-10001] The first argument to modify must be an array or object.'
      );

      // A single numeric argument to modify.
      const caught2 = await processor
        .modify(1)
        .catch((e: MongoshInvalidInputError) => e);
      expect(caught2.message).to.contain(
        '[COMMON-10001] The first argument to modify must be an array or object.'
      );

      // Two object arguments to modify.
      const caught3 = await processor
        .modify(
          { resumeFromCheckpoint: false },
          { dlq: { connectionName: 'foo' } }
        )
        .catch((e: MongoshInvalidInputError) => e);
      expect(caught3.message).to.contain(
        '[COMMON-10001] If the first argument to modify is an object, the second argument should not be specified.'
      );
    });

    it('works with pipeline and options arguments', async function () {
      const name = 'testModify';
      const { runCmdStub, processor } = await createProcessor(name);

      // Start the stream processor.
      await processor.start();
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          { startStreamProcessor: name },
          {}
        )
      ).to.be.true;

      // Stop the stream processor.
      await processor.stop();
      expect(
        runCmdStub.calledWithExactly('admin', { stopStreamProcessor: name }, {})
      ).to.be.true;

      // Modify the stream processor.
      const pipeline2 = [{ $match: { foo: 'baz' } }];
      processor.modify(pipeline2);
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          { modifyStreamProcessor: name, pipeline: pipeline2 },
          {}
        )
      ).to.be.true;

      // Modify the stream processor with extra options.
      const pipeline3 = [{ $match: { foo: 'bat' } }];
      processor.modify(pipeline3, { resumeFromCheckpoint: false });
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          {
            modifyStreamProcessor: name,
            pipeline: pipeline3,
            resumeFromCheckpoint: false,
          },
          {}
        )
      ).to.be.true;

      // Modify the stream processor without changing pipeline.
      processor.modify({ resumeFromCheckpoint: false });
      expect(
        runCmdStub.calledWithExactly(
          'admin',
          { modifyStreamProcessor: name, resumeFromCheckpoint: false },
          {}
        )
      ).to.be.true;
    });
  });
});
