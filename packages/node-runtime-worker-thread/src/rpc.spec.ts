import { expect } from 'chai';
import { EventEmitter } from 'events';

import type { Caller, Exposed, RPCMessageBus } from './rpc';
import { createCaller, exposeAll, close, cancel } from './rpc';

function createMockRpcMesageBus(): RPCMessageBus {
  const ee = new EventEmitter();
  return {
    addEventListener: ee.on.bind(ee),
    removeEventListener: ee.off.bind(ee),
    postMessage: (data: unknown) => ee.emit('message', data),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('rpc', function () {
  let messageBus: RPCMessageBus | null;
  let caller: Caller<{
    meow(...args: any[]): string;
    throws(...args: any[]): never;
    callMe(...args: any[]): void;
    returnsFunction(...args: any[]): Function;
    woof(...args: any[]): string;
    neverResolves(...args: any[]): void;
  }>;
  let exposed: Exposed<unknown>; // adding `| null` breaks TS type inference

  afterEach(function () {
    if (messageBus) {
      messageBus = null;
    }

    if (caller) {
      caller[cancel]();
      caller = null as any;
    }

    if (exposed) {
      exposed[close]();
      exposed = null as any;
    }
  });

  it('exposes functions and allows to call them', async function () {
    messageBus = createMockRpcMesageBus();
    caller = createCaller(['meow'], messageBus);

    exposed = exposeAll(
      {
        meow() {
          return 'Meow meow meow!';
        },
      },
      messageBus
    );

    expect(await caller.meow()).to.equal('Meow meow meow!');
  });

  it('serializes and de-serializes errors when thrown', async function () {
    messageBus = createMockRpcMesageBus();
    caller = createCaller(['throws'], messageBus);

    exposed = exposeAll(
      {
        throws() {
          throw new TypeError('Uh-oh, error!');
        },
      },
      messageBus
    );

    let err!: Error;

    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await caller.throws();
    } catch (e: any) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err).to.have.property('name', 'TypeError');
    expect(err).to.have.property('message', 'Uh-oh, error!');
    expect(err)
      .to.have.property('stack')
      .match(/TypeError: Uh-oh, error!\r?\n\s+at throws/);
  });

  it('allows undefined response', async function () {
    messageBus = createMockRpcMesageBus();
    caller = createCaller(['callMe'], messageBus);

    exposed = exposeAll(
      {
        callMe(fn: any) {
          fn(1, 2);
        },
      },
      messageBus
    );

    expect(await caller.callMe((a: number, b: number) => a + b)).to.be
      .undefined;
  });

  it('allows function response', async function () {
    messageBus = createMockRpcMesageBus();
    caller = createCaller(['returnsFunction'], messageBus);

    exposed = exposeAll(
      {
        returnsFunction() {
          return () => {};
        },
      },
      messageBus
    );

    expect(await caller.returnsFunction()).to.be.instanceof(Function);
  });

  describe('createCaller', function () {
    it('creates a caller with provided method names', function () {
      messageBus = createMockRpcMesageBus();
      caller = createCaller(['meow', 'woof'], messageBus);
      expect(caller).to.have.property('meow');
      expect(caller).to.have.property('woof');
    });

    it('attaches caller listener to provided process', function (done) {
      messageBus = createMockRpcMesageBus();
      caller = createCaller(['meow'], messageBus);

      messageBus.addEventListener('message', (data: unknown) => {
        expect(data).to.have.property('func', 'meow');
        done();
      });

      caller.meow().catch(() => {
        /* meow will be cancelled, noop to avoid unhandled rejection */
      });
    });

    describe('cancel', function () {
      it('stops all in-flight evaluations', async function () {
        messageBus = createMockRpcMesageBus();
        caller = createCaller(['neverResolves'], messageBus);
        let err!: Error;
        try {
          await Promise.all([
            caller.neverResolves(),
            (async () => {
              // smol sleep to make sure we actually issued a call
              await sleep(100);
              caller[cancel]();
            })(),
          ]);
        } catch (e: any) {
          err = e;
        }
        expect(err).to.be.instanceof(Error);
        expect(err).to.have.property('isCanceled', true);
      });
    });
  });

  describe('exposeAll', function () {
    it('exposes passed methods on provided process', function (done) {
      messageBus = createMockRpcMesageBus();

      exposed = exposeAll(
        {
          meow() {
            return 'Meow meow meow meow!';
          },
        },
        messageBus
      );

      messageBus.addEventListener('message', (data: any) => {
        // Due to how our mocks implemented we have to introduce an if here to
        // skip our own message being received by the message bus
        if (data.sender === 'postmsg-rpc/server') {
          expect(data).to.have.property('id', '123abc');
          expect(data).to.have.nested.property(
            'res.payload',
            'Meow meow meow meow!'
          );
          done();
        }
      });

      messageBus.postMessage({
        sender: 'postmsg-rpc/client',
        func: 'meow',
        id: '123abc',
      });
    });
  });
});
