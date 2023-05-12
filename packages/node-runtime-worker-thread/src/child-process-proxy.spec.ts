import path from 'path';
import { ChildProcess, fork, spawn } from 'child_process';
import { Caller, cancel, createCaller } from './rpc';
import { expect } from 'chai';
import { WorkerRuntime } from './worker-runtime';
import { once } from 'events';
import { promisify } from 'util';
import { dummyOptions } from './index.spec';

const childProcessModulePath = path.resolve(
  __dirname,
  '..',
  'dist',
  'child-process-proxy.js'
);

describe('child process worker proxy', () => {
  let caller: Caller<WorkerRuntime>;
  let childProcess: ChildProcess;

  afterEach(() => {
    if (caller) {
      caller[cancel]();
      caller = null;
    }

    if (childProcess) {
      childProcess.disconnect();
      childProcess = null;
    }
  });

  it('should start worker runtime and proxy calls', async() => {
    childProcess = fork(childProcessModulePath);
    caller = createCaller(['init', 'evaluate'], childProcess);
    await caller.init('mongodb://nodb/', dummyOptions, { nodb: true });
    const result = await caller.evaluate('1 + 1');
    expect(result.printable).to.equal(2);
  });

  it('should exit on its own when the parent process disconnects', async() => {
    const intermediateProcess = spawn(process.execPath,
      ['-e', `require("child_process")
         .fork(${JSON.stringify(childProcessModulePath)})
         .on("message", function(m) { console.log("message " + m + " from " + this.pid) })`],
      { stdio: ['pipe', 'pipe', 'inherit'] });

    // Make sure the outer child process runs and has created the inner child process
    const [message] = await once(intermediateProcess.stdout.setEncoding('utf8'), 'data');
    const match = message.trim().match(/^message ready from (?<pid>\d+)$/);
    expect(match).to.not.equal(null);

    // Make sure the inner child process runs
    const childPid = +match.groups.pid;
    process.kill(childPid, 0);

    // Kill the intermediate process and wait for the inner child process to also close
    intermediateProcess.kill('SIGTERM');
    let innerChildHasStoppedRunning = false;
    for (let i = 0; i < 200; i++) {
      try {
        process.kill(childPid, 0);
      } catch (err) {
        if (err.code === 'ESRCH') {
          innerChildHasStoppedRunning = true;
          break;
        }
        throw err;
      }
      await promisify(setTimeout)(10);
    }
    expect(innerChildHasStoppedRunning).to.equal(true);
  });
});
