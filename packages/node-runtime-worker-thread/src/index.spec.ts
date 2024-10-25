import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import type { MongoshBus } from '@mongosh/types';
import { startSharedTestServer } from '../../../testing/integration-testing-hooks';
import { WorkerRuntime } from '../dist/index';

import type { DevtoolsConnectOptions } from '@mongosh/service-provider-node-driver';

export const dummyOptions: DevtoolsConnectOptions = Object.freeze({
  productName: 'Test Product',
  productDocsLink: 'https://example.com/',
});

chai.use(sinonChai);

function createMockEventEmitter() {
  return sinon.stub({ on() {}, emit() {} }) as unknown as MongoshBus;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('WorkerRuntime', function () {
  let runtime: WorkerRuntime | null = null;

  afterEach(async function () {
    if (runtime) {
      await runtime.terminate();
      runtime = null;
    }
  });

  describe('evaluate', function () {
    it('should evaluate and return basic values', async function () {
      runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
        nodb: true,
      });
      const result = await runtime.evaluate('1+1');

      expect(result.printable).to.equal(2);
    });

    describe('errors', function () {
      it("should throw an error if it's thrown during evaluation", async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        let err!: Error;

        try {
          await runtime.evaluate('throw new TypeError("Oh no, types!")');
        } catch (e: any) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err).to.have.property('name', 'TypeError');
        expect(err).to.have.property('message', 'Oh no, types!');
        expect(err)
          .to.have.property('stack')
          .matches(/TypeError: Oh no, types!/);
      });

      it("should return an error if it's returned from evaluation", async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        const { printable } = await runtime.evaluate(
          'new SyntaxError("Syntax!")'
        );

        expect(printable).to.be.instanceof(Error);
        expect(printable).to.have.property('name', 'SyntaxError');
        expect(printable).to.have.property('message', 'Syntax!');
        expect(printable)
          .to.have.property('stack')
          .matches(/SyntaxError: Syntax!/);
      });

      it('COMPASS-5919 - correctly serializes babel parse errors', async function () {
        /**
         * babel syntax errors have a `clone()` method, which breaks structured cloning
         */
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        const err: Error = await runtime.evaluate('1 +* 3').catch((e) => e);

        expect(err).to.be.instanceof(Error);
        expect(err).to.have.property('name', 'SyntaxError');
      });

      context(
        'when `evaluate` returns an error that has a function property',
        function () {
          it('removes the function property from the error', async function () {
            runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
              nodb: true,
            });

            const script = `
          class CustomError extends Error {
            constructor() {
              super('custom error');
            }
            foo() {
              return 'hello, world';
            }
          }
          throw new CustomError();
          `;

            const err: Error = await runtime.evaluate(script).catch((e) => e);

            expect(err).to.be.instanceof(Error);
            expect(err).to.have.property('name', 'Error');
            expect(err).not.to.have.property('foo');
            expect(err).to.have.property('message', 'custom error');
          });
        }
      );
    });
  });

  describe('getCompletions', function () {
    const testServer = startSharedTestServer();

    it('should return completions', async function () {
      runtime = new WorkerRuntime(
        await testServer.connectionString(),
        dummyOptions
      );
      const completions = await runtime.getCompletions('db.coll1.f');

      expect(completions).to.deep.contain({ completion: 'db.coll1.find' });
    });
  });

  describe('getShellPrompt', function () {
    const testServer = startSharedTestServer();

    it('should return prompt when connected to the server', async function () {
      runtime = new WorkerRuntime(
        await testServer.connectionString(),
        dummyOptions
      );
      const result = await runtime.getShellPrompt();

      expect(result).to.match(/>/);
    });
  });

  describe('setEvaluationListener', function () {
    it('allows to set evaluation listener for runtime', async function () {
      const evalListener = {
        onPrompt: sinon.spy(() => 'password123'),
      };

      runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
        nodb: true,
      });

      runtime.setEvaluationListener(evalListener);

      const password = await runtime.evaluate('passwordPrompt()');

      expect(evalListener.onPrompt).to.have.been.called;
      expect(password.printable).to.equal('password123');
    });
  });

  describe('eventEmitter', function () {
    const testServer = startSharedTestServer();

    it('should propagate emitted events from worker', async function () {
      const eventEmitter = createMockEventEmitter();

      runtime = new WorkerRuntime(
        await testServer.connectionString(),
        dummyOptions,
        {},
        {},
        eventEmitter
      );

      await runtime.evaluate('db.getCollectionNames()');

      expect(eventEmitter.emit).to.have.been.calledWith(
        'mongosh:api-call-with-arguments',
        {
          arguments: {},
          class: 'Database',
          db: 'test',
          method: 'getCollectionNames',
        }
      );
    });
  });

  describe('terminate', function () {
    // We will be testing a bunch of private props that can be accessed only with
    // strings to make TS happy
    it('should terminate child process', async function () {
      const runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
        nodb: true,
      });
      await runtime.waitForRuntimeToBeReady();
      const terminateSpy = sinon.spy(runtime['workerProcess'], 'terminate');
      await runtime.terminate();
      expect(terminateSpy.calledOnce).to.be.true;
    });

    it('should cancel any in-flight runtime calls', async function () {
      const runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
        nodb: true,
      });
      let err!: Error;
      try {
        await Promise.all([
          runtime.evaluate('while(true){}'),
          (async () => {
            // smol sleep to make sure we actually issued a call
            await sleep(100);
            await runtime.terminate();
          })(),
        ]);
      } catch (e: any) {
        err = e;
      }
      expect(err).to.be.instanceof(Error);
      expect(err).to.have.property('isCanceled', true);
    });
  });

  describe('interrupt', function () {
    context('async tasks', function () {
      it('should interrupt in-flight tasks', async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        await runtime.waitForRuntimeToBeReady();

        let err!: Error;

        try {
          await Promise.all([
            runtime.evaluate('sleep(1000000)'),
            (async () => {
              // This is flaky when not enough time is given to the worker to
              // finish the sync part of the work. If it causes too much issues
              // it would be okay to disable this test completely
              await sleep(5000);
              await runtime.interrupt();
            })(),
          ]);
        } catch (e: any) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err)
          .to.have.property('message')
          .match(/Async script execution was interrupted/);
      });

      it('should allow to evaluate again after interruption', async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        await runtime.waitForRuntimeToBeReady();

        try {
          await Promise.all([
            runtime.evaluate('sleep(1000000)'),
            (async () => {
              await sleep(200);
              await runtime.interrupt();
            })(),
          ]);
        } catch (e: any) {
          // ignore
        }

        const result = await runtime.evaluate('1+1');

        expect(result).to.have.property('printable', 2);
      });

      it('should preserve the context after interruption', async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        await runtime.waitForRuntimeToBeReady();

        await runtime.evaluate('let x = 1');
        await runtime.evaluate('x = x + 2');

        try {
          await Promise.all([
            runtime.evaluate('sleep(1000000)'),
            (async () => {
              await sleep(200);
              await runtime.interrupt();
            })(),
          ]);
        } catch (e: any) {
          // ignore
        }

        const result = await runtime.evaluate('x + 3');

        expect(result).to.have.property('printable', 6);
      });
    });

    context('sync tasks', function () {
      it('should interrupt in-flight tasks', async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        await runtime.waitForRuntimeToBeReady();

        let err!: Error;

        try {
          await Promise.all([
            runtime.evaluate('while(true){}'),
            (async () => {
              await sleep(200);
              await runtime.interrupt();
            })(),
          ]);
        } catch (e: any) {
          err = e;
        }

        expect(err).to.be.instanceof(Error);
        expect(err)
          .to.have.property('message')
          .match(/Script execution was interrupted/);
      });

      it('should allow to evaluate again after interruption', async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        await runtime.waitForRuntimeToBeReady();

        try {
          await Promise.all([
            runtime.evaluate('while(true){}'),
            (async () => {
              await sleep(200);
              await runtime.interrupt();
            })(),
          ]);
        } catch (e: any) {
          // ignore
        }

        const result = await runtime.evaluate('1+1');

        expect(result).to.have.property('printable', 2);
      });

      it('should preserve the context after interruption', async function () {
        runtime = new WorkerRuntime('mongodb://nodb/', dummyOptions, {
          nodb: true,
        });

        await runtime.waitForRuntimeToBeReady();

        await runtime.evaluate('let x = 1');
        await runtime.evaluate('x = x + 2');

        try {
          await Promise.all([
            runtime.evaluate('while(true){}'),
            (async () => {
              await sleep(200);
              await runtime.interrupt();
            })(),
          ]);
        } catch (e: any) {
          // ignore
        }

        const result = await runtime.evaluate('x + 3');
        expect(result).to.have.property('printable', 6);
      });
    });
  });
});
