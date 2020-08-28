/* eslint camelcase: 0, @typescript-eslint/camelcase: 0, no-sync: 0*/
import logger from './logger';
import Nanobus from 'nanobus';
import { expect } from 'chai';
import sinon from 'ts-sinon';
import tmp from 'tmp';

describe('logger', () => {
  const bus = new Nanobus('mongosh');
  const logDirectory = tmp.dirSync({ unsafeCleanup: true });
  logger(bus, logDirectory.name);

  context('mongosh:connect', () => {
    const connectEvent = {
      is_atlas: false,
      is_localhost: true,
      server_version: '4.40',
      is_enterprise: false,
      is_data_lake: false,
      is_genuine: true,
      non_genuine_server_name: 'mongodb',
      node_version: '12.4.0',
      uri: 'localhost:27017'
    };
    const listener = bus.listeners('mongosh:connect');

    it('mongosh:connect listener is not undefined', () => {
      expect(listener).to.not.be.undefined;
    });

    it('mongosh:connect listener is called', () => {
      const spy = sinon.spy(listener);
      bus.emit('mongosh:connect', connectEvent);
      expect(spy).to.have.been.called;
    });
  });
});
