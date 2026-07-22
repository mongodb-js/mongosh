/**
 * Fixture for the "let the process exit while the server is still holding the
 * request open" test. Sends one beacon to a server that never responds, prints
 * the outcome, and then simply reaches the end of the script. Exit must happen
 * naturally: unref'd sockets must not keep the event loop alive.
 */
import { FireAndForgetBeacon } from '../../src/fire-and-forget-beacon';

const port = Number.parseInt(process.argv[2], 10);

async function main(): Promise<void> {
  const beacon = new FireAndForgetBeacon();
  const outcome = await beacon.send(`http://localhost:${port}/v1/exit-test`, {
    Cookie: 'mge=exit-test',
  });
  process.stdout.write(JSON.stringify(outcome));
}

void main();
