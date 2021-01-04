import {
  ChildProcess,
  Serializable,
  spawn,
  SpawnOptionsWithoutStdio,
  StdioNull,
  StdioPipe
} from 'child_process';

export default function spawnChildFromSource(
  src: string,
  spawnOptions: SpawnOptionsWithoutStdio = {},
  timeoutMs?: number,
  _stdout: StdioNull | StdioPipe = 'inherit',
  _stderr: StdioNull | StdioPipe = 'inherit',
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const readyToken = Date.now().toString(32);

    const childProcess = spawn(process.execPath, {
      stdio: ['pipe', _stdout, _stderr, 'ipc'],
      ...spawnOptions
    });

    if (!childProcess.stdin) {
      return reject(
        new Error("Can't write src to the spawned process, missing stdin")
      );
    }

    // eslint-disable-next-line prefer-const
    let timeoutId: NodeJS.Timeout | null;

    const onExit = (exitCode: number | null) => {
      if (exitCode && exitCode > 0) {
        reject(new Error('Child process exited with error before starting'));
      }
    };

    const onMessage = (data: Serializable) => {
      if (data === readyToken) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        childProcess.off('exit', onExit);
        resolve(childProcess);
      }
    };

    childProcess.on('message', onMessage);

    childProcess.on('exit', onExit);

    childProcess.stdin.write(src);
    childProcess.stdin.write(`;process.send(${JSON.stringify(readyToken)})`);
    childProcess.stdin.end();

    timeoutId =
      timeoutMs !== undefined
        ? setTimeout(() => {
          reject(
            new Error('Timed out while waiting for child process to start')
          );
          childProcess.kill('SIGTERM');
        }, timeoutMs)
        : null;
  });
}
