import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import Database from './database';
import Mongo from './mongo';
import { InterruptFlag, MongoshInterruptedError } from './interruptor';
import ShellInstanceState from './shell-instance-state';
import { promisify } from 'util';

describe('interruptor', () => {
  describe('InterruptFlag', () => {
    let interruptFlag: InterruptFlag;

    beforeEach(() => {
      interruptFlag = new InterruptFlag();
    });

    describe('asPromise', () => {
      let interruptPromise: { destroy: () => void; promise: Promise<never> };

      it('rejects the promise on interrupt', async() => {
        interruptPromise = interruptFlag.asPromise();
        let interruptError: MongoshInterruptedError | undefined;
        interruptPromise.promise.catch(e => {
          interruptError = e;
        });
        expect(interruptError).to.be.undefined;
        interruptFlag.set();
        await promisify(process.nextTick)();
        expect(interruptError).to.be.instanceOf(MongoshInterruptedError);
      });

      it('rejects immediately if the interrupt happened before', async() => {
        interruptFlag.set();

        interruptPromise = interruptFlag.asPromise();
        let interruptError: MongoshInterruptedError | undefined;
        interruptPromise.promise.catch(e => {
          interruptError = e;
        });

        await promisify(process.nextTick)();
        expect(interruptError).to.be.instanceOf(MongoshInterruptedError);
      });
    });
  });

  describe('with Shell API functions', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let instanceState: ShellInstanceState;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      instanceState = new ShellInstanceState(serviceProvider, bus);
      mongo = new Mongo(instanceState, undefined, undefined, undefined, serviceProvider);
      database = new Database(mongo, 'db1');
    });

    it('causes an interrupt error to be thrown on entry', async() => {
      instanceState.interrupted.set();
      try {
        await database.runCommand({ some: 1 });
      } catch (e) {
        expect(e.name).to.equal('MongoshInterruptedError');
        expect(serviceProvider.runCommand).to.not.have.been.called;
        expect(serviceProvider.runCommandWithCheck).to.not.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });

    it('causes an interrupt error to be thrown on exit', async() => {
      let resolveCall: (result: any) => void;
      serviceProvider.runCommandWithCheck.resolves(new Promise(resolve => {
        resolveCall = resolve;
      }));

      const runCommand = database.runCommand({ some: 1 });
      await new Promise(setImmediate);
      await new Promise(setImmediate); // ticks due to db._baseOptions() being async
      instanceState.interrupted.set();
      resolveCall({ ok: 1 });

      try {
        await runCommand;
      } catch (e) {
        expect(e.name).to.equal('MongoshInterruptedError');
        expect(serviceProvider.runCommandWithCheck).to.have.been.called;
        return;
      }
      expect.fail('Expected error');
    });
  });
});
