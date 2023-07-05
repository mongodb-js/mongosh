import type {
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
} from 'child_process';
import * as spawn from 'cross-spawn';

export function spawnSync(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding
): SpawnSyncReturns<string>;
export function spawnSync(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
  ignoreErrors: false
): SpawnSyncReturns<string>;
export function spawnSync(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
  ignoreErrors: true
): SpawnSyncReturns<string> | undefined;
export function spawnSync(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
  ignoreErrors = false
): SpawnSyncReturns<string> | undefined {
  const result = spawn.sync(command, args, options);
  if (result.error) {
    console.error('spawn.sync returned error', result.error);
    console.error(result.stdout);
    console.error(result.stderr);

    if (!ignoreErrors) {
      throw new Error(
        `Failed to spawn ${command}, args: ${args.join(',')}: ${result.error}`
      );
    } else {
      console.warn('Ignoring error and continuing...');
    }
  } else if (result.status !== 0) {
    console.error('spawn.sync exited with non-zero', result.status);
    console.error(result.stdout);
    console.error(result.stderr);
    if (!ignoreErrors) {
      throw new Error(
        `Spawn exited non-zero for ${command}, args: ${args.join(',')}: ${
          result.status
        }`
      );
    } else {
      console.warn('Ignoring error and continuing...');
    }
  }
  return result;
}
