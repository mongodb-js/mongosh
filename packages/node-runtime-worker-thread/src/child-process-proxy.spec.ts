import path from 'path';
import { fork } from 'child_process';
import { createCaller } from './rpc';
import { expect } from 'chai';

const childProcessModulePath = path.resolve(__dirname, '..', 'dist', 'child-process-proxy.js');

describe('child process worker proxy', () => {
  it('should start worker runtime and proxy calls', async() => {
    const childProcess = fork(childProcessModulePath);
    const caller = createCaller(['init', 'evaluate'] as const, childProcess);
    await caller.init('mongodb://nodb/', {}, { nodb: true });
    const result = await caller.evaluate('1 + 1');
    expect(result.printable).to.equal(2);
    childProcess.kill();
  });
});
