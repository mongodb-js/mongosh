import { expect } from 'chai';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

import { createCaller, exposeAll } from './rpc';

function createMockRpcProcess(): ChildProcess {
  const e = new EventEmitter();
  (e as any).send = (data: any) => e.emit('message', data);
  return e as ChildProcess;
}

describe('createCaller', () => {
  it('creates a caller with provided method names', () => {
    const rpcProcess = createMockRpcProcess();
    const caller = createCaller(['meow', 'woof'] as const, rpcProcess);
    expect(caller).to.have.property('meow');
    expect(caller).to.have.property('woof');
    rpcProcess.removeAllListeners();
  });

  it('attaches caller listener to provided process', (done) => {
    const rpcProcess = createMockRpcProcess();
    const caller = createCaller(['meow'] as const, rpcProcess);

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
    const rpcProcess = createMockRpcProcess();

    exposeAll(
      {
        meow() {
          return 'Meow meow meow meow!';
        }
      },
      rpcProcess
    );

    rpcProcess.on('message', (data: any) => {
      // Due to how our mocks implemented here we have to introduce an if here
      // to skip our own message
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
