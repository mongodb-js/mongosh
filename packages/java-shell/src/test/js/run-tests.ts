import { spawn } from 'child_process';
import path from 'path';
import { once } from 'events';
import { startSharedTestServer } from '../../../../../testing/integration-testing-hooks';

describe('java-shell tests', function() {
  this.timeout(1_000_000);
  const testServer = startSharedTestServer();
  const packageRoot = path.resolve(__dirname, '..', '..', '..') + '/';

  before(async function () {
    // We don't have a way to allow warnings for individual tests here
    testServer.allowWarning?.(() => true);

    process.env.JAVA_SHELL_MONGOSH_TEST_URI = (await testServer.connectionString()).replace(/\/$/, '');

    const connectionString = await testServer.connectionString();
    const mongosh = spawn(
      process.execPath,
      [ path.resolve(packageRoot, '..', 'cli-repl', 'bin', 'mongosh.js'), connectionString ],
      { stdio: [ 'pipe', 'inherit', 'inherit' ] });
    mongosh.stdin.write(`
      use admin;
      db.createUser({ user: "admin", pwd: "admin", roles: ["root"]});
      .exit
    `);
    await once(mongosh, 'exit');
  });

  it('passes the JavaShell tests', async function() {
    const opts = { stdio: 'inherit', cwd: packageRoot, shell: true } as const;
    let proc;
    if (process.platform !== 'win32') {
      proc = spawn('./gradlew test --info', [], opts);
    } else {
      proc = spawn('.\\gradlew.bat test --info', [], opts);
    }
    await once(proc, 'exit');
    if (proc.exitCode !== 0) {
      throw new Error(`java-shell tests failed (exit code ${proc.exitCode}, signal ${proc.signalCode})`);
    }
  });
});

