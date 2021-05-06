import { bson, ServiceProvider } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { StubbedInstance, stubInterface } from 'ts-sinon';
import Database from './database';
import Mongo from './mongo';
import ShellInternalState from './shell-internal-state';

describe('interruptor', () => {
  describe('with Shell API functions', () => {
    let mongo: Mongo;
    let serviceProvider: StubbedInstance<ServiceProvider>;
    let database: Database;
    let bus: StubbedInstance<EventEmitter>;
    let internalState: ShellInternalState;

    beforeEach(() => {
      bus = stubInterface<EventEmitter>();
      serviceProvider = stubInterface<ServiceProvider>();
      serviceProvider.initialDb = 'test';
      serviceProvider.bsonLibrary = bson;
      serviceProvider.runCommand.resolves({ ok: 1 });
      serviceProvider.runCommandWithCheck.resolves({ ok: 1 });
      internalState = new ShellInternalState(serviceProvider, bus);
      mongo = new Mongo(internalState, undefined, undefined, undefined, serviceProvider);
      database = new Database(mongo, 'db1');
    });

    it('causes an interrupt error to be thrown on entry', async() => {
      internalState.interrupted = true;
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
      serviceProvider.runCommandWithCheck.callsFake(() => {
        return new Promise(resolve => {
          resolveCall = resolve;
        });
      });

      const runCommand = database.runCommand({ some: 1 });
      internalState.interrupted = true;
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
