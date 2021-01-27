import { expect } from 'chai';
import { EventEmitter } from 'events';

import { createCaller, exposeAll } from './rpc';

function createMockRpcMesageBus() {
  const bus = new (class Bus extends EventEmitter {
    send(data: any) {
      this.emit('message', data);
    }
  })();
  return bus;
}

describe('rpc', () => {
  it('exposes functions and allows to call them', async() => {
    const rpcProcess = createMockRpcMesageBus();
    const caller = createCaller(['meow'], rpcProcess);

    exposeAll(
      {
        meow() {
          return 'Meow meow meow!';
        }
      },
      rpcProcess
    );

    expect(await caller.meow()).to.equal('Meow meow meow!');
  });

  it('serializes and de-serializes errors when thrown', async() => {
    const rpcProcess = createMockRpcMesageBus();
    const caller = createCaller(['throws'], rpcProcess);

    exposeAll(
      {
        throws() {
          throw new TypeError('Uh-oh, error!');
        }
      },
      rpcProcess
    );

    let err: Error;

    try {
      await caller.throws();
    } catch (e) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err).to.have.property('name', 'TypeError');
    expect(err).to.have.property('message', 'Uh-oh, error!');
    expect(err)
      .to.have.property('stack')
      .match(/TypeError: Uh-oh, error!\r?\n\s+at throws/);
  });

  it('throws on client if arguments are not serializable', async() => {
    const rpcProcess = createMockRpcMesageBus();
    const caller = createCaller(['callMe'], rpcProcess);

    exposeAll(
      {
        callMe(fn: any) {
          fn(1, 2);
        }
      },
      rpcProcess
    );

    let err: Error;

    try {
      await caller.callMe((a: number, b: number) => a + b);
    } catch (e) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err)
      .to.have.property('message')
      .match(/could not be cloned/);
  });

  it('throws on client if retured value from the server is not serializable', async() => {
    const rpcProcess = createMockRpcMesageBus();
    const caller = createCaller(['returnsFunction'], rpcProcess);

    exposeAll(
      {
        returnsFunction() {
          return () => {};
        }
      },
      rpcProcess
    );

    let err: Error;

    try {
      await caller.returnsFunction();
    } catch (e) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err)
      .to.have.property('message')
      .match(/could not be cloned/);
  });

  describe('createCaller', () => {
    it('creates a caller with provided method names', () => {
      const rpcProcess = createMockRpcMesageBus();
      const caller = createCaller(['meow', 'woof'], rpcProcess);
      expect(caller).to.have.property('meow');
      expect(caller).to.have.property('woof');
      rpcProcess.removeAllListeners();
    });

    it('attaches caller listener to provided process', (done) => {
      const rpcProcess = createMockRpcMesageBus();
      const caller = createCaller(['meow'], rpcProcess);

      rpcProcess.on('message', (data) => {
        expect(data).to.have.property('func');
        expect((data as any).func).to.equal('meow');
        done();
      });

      caller.meow();
    });
  });

  describe('exposeAll', () => {
    it('exposes passed methods on provided process', (done) => {
      const rpcProcess = createMockRpcMesageBus();

      exposeAll(
        {
          meow() {
            return 'Meow meow meow meow!';
          }
        },
        rpcProcess
      );

      rpcProcess.on('message', (data: any) => {
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

      rpcProcess.send({
        sender: 'postmsg-rpc/client',
        func: 'meow',
        id: '123abc'
      });
    });
  });
});
