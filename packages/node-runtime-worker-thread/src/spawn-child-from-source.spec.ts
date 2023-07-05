import { expect } from 'chai';
import type { ChildProcess } from 'child_process';
import childProcess from 'child_process';
import { once } from 'events';
import spawnChildFromSource, { kill } from './spawn-child-from-source';

describe('spawnChildFromSource', function () {
  let spawned: ChildProcess;

  afterEach(async function () {
    if (spawned) {
      await kill(spawned, 'SIGKILL');
      spawned = null;
    }
  });

  it('should throw if stdin is missing', async function () {
    let err: Error;

    try {
      spawned = await spawnChildFromSource('console.log("Hi")', {
        // Making istanbul happy by passing stuff that's not allowed
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        stdio: 'ignore',
      });
    } catch (e: any) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err)
      .to.have.property('message')
      .match(/missing stdin/);
  });

  it('should resolve with a child process', async function () {
    spawned = await spawnChildFromSource('');
    expect(spawned).to.be.instanceof((childProcess as any).ChildProcess);
  });

  it('should spawn a process with an ipc channel open', async function () {
    spawned = await spawnChildFromSource(
      'process.on("message", (data) => process.send(data))'
    );
    spawned.send('Hi!');
    const [message] = await once(spawned, 'message');
    expect(message).to.equal('Hi!');
  });

  it('should fail if process exited before successfully starting', async function () {
    let err: Error;

    try {
      spawned = await spawnChildFromSource(
        'throw new Error("Whoops!")',
        {},
        undefined,
        'ignore',
        'ignore'
      );
    } catch (e: any) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err.message).to.match(
      /Child process exited with error before starting/
    );
  });

  it('should fail if a timeout exceeded before the process is "ready"', async function () {
    let err: Error;

    try {
      spawned = await spawnChildFromSource(
        'let i = 0; while(++i < 10000000000){};',
        {},
        10
      );
    } catch (e: any) {
      err = e;
    }

    expect(err).to.be.instanceof(Error);
    expect(err.message).to.match(
      /Timed out while waiting for child process to start/
    );
  });
});
