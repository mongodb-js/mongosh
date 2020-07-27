import CompassShellStore from 'stores';
import { EventEmitter } from 'events';
import { ElectronRuntime } from '@mongosh/browser-runtime-electron';

describe('CompassShellStore [Store]', () => {
  let store;
  let appRegistry;

  beforeEach(() => {
    store = new CompassShellStore();
    appRegistry = new EventEmitter();
    store.onActivated(appRegistry);
  });

  describe('appRegistry', () => {
    it('sets the global appregistry', () => {
      expect(store.reduxStore.getState().appRegistry).to.not.equal(null);
      expect(store.reduxStore.getState().appRegistry.globalAppRegistry).to.not.equal(null);
    });
  });

  describe('runtime', () => {
    const getRuntimeState = () => store.reduxStore.getState().runtime;

    it('has initialized runtime state', () => {
      const runtimeState = getRuntimeState();

      expect(runtimeState.error).to.equal(null);
      expect(runtimeState.runtime).to.equal(null);
    });

    it('sets runtime on data-service-connected', () => {
      appRegistry.emit('data-service-connected', null, {client: {client: {}}});

      const runtimeState = getRuntimeState();

      expect(runtimeState.error).to.equal(null);
      expect(runtimeState.runtime).to.be.instanceOf(ElectronRuntime);
    });

    it('sets error if data-service-connected has one', () => {
      const error = new Error();
      appRegistry.emit('data-service-connected', error, null);

      const runtimeState = getRuntimeState();

      expect(runtimeState.error).to.equal(error);
      expect(runtimeState.runtime).to.equal(null);
    });

    it('does not change state if dataService is the same', () => {
      const fakeDataService = {client: {client: {}}};

      appRegistry.emit('data-service-connected', null, fakeDataService);
      const runtimeState1 = getRuntimeState();

      appRegistry.emit('data-service-connected', null, fakeDataService);
      const runtimeState2 = getRuntimeState();

      expect(runtimeState1).to.equal(runtimeState2);
    });

    it('resets the runtime on data-service-disconnected', () => {
      appRegistry.emit('data-service-disconnected');
      const runtimeState = getRuntimeState();

      expect(runtimeState.runtime).to.equal(null);
    });
  });
});
