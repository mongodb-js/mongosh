import type { ServiceProvider } from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import type { EventEmitter } from 'events';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import { Database } from './database';
import Mongo from './mongo';
import { InterruptFlag, MongoshInterruptedError } from './interruptor';
import ShellInstanceState from './shell-instance-state';
import { promisify } from 'util';

describe('interruptor', function () {
  describe('InterruptFlag', function () {
    let interruptFlag: InterruptFlag;

    beforeEach(function () {
      interruptFlag = new InterruptFlag();
    });

    describe('asPromise', function () {
      let interruptPromise: { destroy: () => void; promise: Promise<never> };

      it('rejects the promise on interrupt', async function () {
        interruptPromise = interruptFlag.asPromise();
        let interruptError: MongoshInterruptedError | undefined;
        interruptPromise.promise.catch((e) => {
          interruptError = e;
        });
        expect(interruptError).to.be.undefined;
        await interruptFlag.set();
        await promisify(process.nextTick)();
        expect(interruptError).to.be.instanceOf(MongoshInterruptedError);
      });

      it('rejects immediately if the interrupt happened before', async function () {
        await interruptFlag.set();

        interruptPromise = interruptFlag.asPromise();
        let interruptError: MongoshInterruptedError | undefined;
        interruptPromise.promise.catch((e) => {
          interruptError = e;
        });

        await promisify(process.nextTick)();
        expect(interruptError).to.be.instanceOf(MongoshInterruptedError);
      });
    });
  });

  describe('with Shell API functions', function () {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;

    beforeEach(function () {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(
        instanceState,
        undefined,
        undefined,
        undefined,
        serviceProvider
      );
      database = new Database(mongo, 'db1');
    });

    it('causes an interrupt error to be thrown on entry', async function () {
      await instanceState.interrupted.set();
      try {
        await database.runCommand({ some: 1 });
      } catch (e: any) {
        expect(e.name).to.equal('MongoshInterruptedError');
        expect(serviceProvider.runCommand).to.not.have.been.called;
        expect(serviceProvider.runCommandWithCheck).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('causes an interrupt error to be thrown on exit', async function () {
      let resolveCall!: (result: any) => void;
      serviceProvider.runCommandWithCheck.resolves(
        new Promise((resolve) => {
          resolveCall = resolve;
        })
      );

      const runCommand = database.runCommand({ some: 1 });
      await new Promise(setImmediate);
      await new Promise(setImmediate); // ticks due to db._baseOptions() being async
      await instanceState.interrupted.set();
      resolveCall({ ok: 1 });

      try {
        await runCommand;
      } catch (e: any) {
        expect(e.name).to.equal('MongoshInterruptedError');
        expect(serviceProvider.runCommandWithCheck).to.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });
  });
});
