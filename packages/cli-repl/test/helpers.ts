import { spawn } from 'child_process';
import path from 'path';
import stripAnsi from 'strip-ansi';

export async function eventually(fn) {
  let i = 50;
  let err;

  while(i) {
    i--;

    try {
      await fn();
      return;
    } catch (e) {
      err = e;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw err;
}

const openShells = [];

export function startShell(...args) {
  const execPath = path.resolve(__dirname, '..', 'bin', 'mongosh.js');

  const shell = spawn('node', [execPath, ...args], {
    stdio: [ 'pipe', 'pipe', 'pipe' ]
  });

  const stdio = {
    stdin: shell.stdin,
    stdout: '',
    stderr: ''
  }

  shell.stdout.on('data', (chunk) => { stdio.stdout += stripAnsi(chunk.toString()); })
  shell.stderr.on('data', (chunk) => { stdio.stderr += stripAnsi(chunk.toString()); })

  openShells.push(shell);

  return {
    process: shell,
    stdio,
  };
}

export function killOpenShells() {
  while(openShells.length) {
    openShells.pop().kill();
  }
}