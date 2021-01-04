import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import childProcess from 'child_process';
import { once } from 'events';

import spawnChildFromSource from './spawn-child-from-source';

chai.use(chaiAsPromised);

describe('spawnChildFromSource', () => {
  it('should resolve with a child process', async() => {
    const spawned = await spawnChildFromSource('');
    expect(spawned).to.be.instanceof((childProcess as any).ChildProcess);
    spawned.kill('SIGTERM');
  });

  it('should spawn a process with an ipc channel open', async() => {
    const spawned = await spawnChildFromSource(
      'process.on("message", (data) => process.send(data))'
    );
    spawned.send('Hi!');
    const [message] = await once(spawned, 'message');
    expect(message).to.equal('Hi!');
    spawned.kill('SIGTERM');
  });

  it('should fail if process exited before successfully starting', () => {
    return expect(
      spawnChildFromSource(
        'throw new Error("Whoops!")',
        {},
        undefined,
        'ignore',
        'ignore'
      )
    ).to.eventually.be.rejected;
  });

  it('should fail if a timeout exceeded before the process is "ready"', () => {
    return expect(
      spawnChildFromSource(
        'while(true){}',
        {},
        200
      )
    ).to.eventually.be.rejected;
  });
});
