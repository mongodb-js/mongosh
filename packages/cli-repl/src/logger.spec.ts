/* eslint camelcase: 0, @typescript-eslint/camelcase: 0, no-sync: 0*/
import logger from './logger';
import Nanobus from 'nanobus';
import { expect } from 'chai';
import tmp from 'tmp';

describe('logger', () => {
  const bus = new Nanobus('mongosh');
  const logDirectory = tmp.dirSync({ unsafeCleanup: true });
  logger(bus, logDirectory.name);

  context('mongosh:connect', () => {
    const listener = bus.listeners('mongosh:connect');

    it('mongosh:connect listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:new-user', () => {
    const listener = bus.listeners('mongosh:new-user');

    it('mongosh:new-user listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:update-user', () => {
    const listener = bus.listeners('mongosh:update-user');

    it('mongosh:update-user listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:error', () => {
    const listener = bus.listeners('mongosh:error');

    it('mongosh:error listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:help', () => {
    const listener = bus.listeners('mongosh:help');

    it('mongosh:help listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:rewritten-async-input', () => {
    const listener = bus.listeners('mongosh:rewritten-async-input');

    it('mongosh:rewritten-async-input listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:use', () => {
    const listener = bus.listeners('mongosh:use');

    it('mongosh:use listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:show', () => {
    const listener = bus.listeners('mongosh:show');

    it('mongosh:show listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:setCtx', () => {
    const listener = bus.listeners('mongosh:setCtx');

    it('mongosh:setCtx listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });

  context('mongosh:api-call', () => {
    const listener = bus.listeners('mongosh:apiEvent');

    it('mongosh:api-call listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });
  });
});
