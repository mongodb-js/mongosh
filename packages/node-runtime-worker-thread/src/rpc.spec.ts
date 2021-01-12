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
        expect(data.id).to.be.equal('123abc');
        expect(data.res).to.be.equal('Meow meow meow meow!');
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
