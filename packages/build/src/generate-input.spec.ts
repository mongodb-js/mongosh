import { expect } from 'chai';
import childProcess from 'child_process';
import { promises as fs } from 'fs';
import generateInput from './generate-input';
import rimraf from 'rimraf';
import path from 'path';
import { promisify } from 'util';
const execFile = promisify(childProcess.execFile);

describe('input bundling', function() {
  this.timeout(60_000);
  const tmpdir = path.resolve(
    __dirname, '..', '..', '..', 'tmp', `test-build-${Date.now()}-${Math.random()}`);

  beforeEach(async() => {
    await fs.mkdir(tmpdir, { recursive: true });
  });

  afterEach(async() => {
    await promisify(rimraf)(tmpdir);
  });

  it('bundles input files together', async() => {
    await fs.writeFile(path.join(tmpdir, 'a.js'), 'module.exports="works"');
    await fs.writeFile(path.join(tmpdir, 'b.js'), `
      console.log(JSON.stringify({
        main: 'it ' + require("./a") + '!',
        analytics: require("./analytics")
      }));
      `);
    await generateInput(
      path.join(tmpdir, 'b.js'),
      path.join(tmpdir, 'compiled.js'),
      path.join(tmpdir, 'analytics.js'),
      '...segment-key...');
    await fs.unlink(path.join(tmpdir, 'a.js'));
    await fs.unlink(path.join(tmpdir, 'b.js'));
    await fs.unlink(path.join(tmpdir, 'analytics.js'));
    const { stdout } = await execFile(process.execPath, [path.join(tmpdir, 'compiled.js')]);
    const parsed = JSON.parse(stdout);
    expect(parsed.main).to.equal('it works!');
    expect(parsed.analytics.SEGMENT_API_KEY).to.equal('...segment-key...');
  });

  it('does not attempt to load ES6 modules because parcel cannot handle them properly', async() => {
    const pkg = path.join(tmpdir, 'node_modules', 'some-fake-module');
    await fs.mkdir(pkg, { recursive: true });
    await fs.writeFile(path.join(pkg, 'package.json'), '{"main":"./cjs.js","module":"./esm.mjs"}');
    await fs.writeFile(path.join(pkg, 'cjs.js'), 'module.exports = "cjs"');
    await fs.writeFile(path.join(pkg, 'esm.mjs'), 'module.exports = "esm"');
    await fs.writeFile(path.join(tmpdir, 'b.js'), `
      console.log(require("some-fake-module"));
      `);
    await generateInput(
      path.join(tmpdir, 'b.js'),
      path.join(tmpdir, 'compiled.js'),
      path.join(tmpdir, 'analytics.js'),
      '...segment-key...');
    const { stdout } = await execFile(process.execPath, [path.join(tmpdir, 'compiled.js')]);
    expect(stdout.trim()).to.equal('cjs');
  });
});
