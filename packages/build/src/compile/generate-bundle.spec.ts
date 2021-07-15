import { expect } from 'chai';
import childProcess from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { generateBundle } from './generate-bundle';
import type { Config } from '../config';

const execFile = promisify(childProcess.execFile);

describe('compile generateBundle', function() {
  this.timeout(60_000);
  let tmpdir: string;

  beforeEach(async() => {
    tmpdir = path.resolve(
      __dirname, '..', '..', '..', 'tmp', `test-build-${Date.now()}-${Math.random()}`
    );
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
        buildInfo: require("./buildInfo.json")
      }));
      `);
    await generateBundle({
      input: path.join(tmpdir, 'b.js'),
      execInput: path.join(tmpdir, 'compiled.js'),
      buildInfoFilePath: path.join(tmpdir, 'buildInfo.json'),
      segmentKey: '...segment-key...'
    } as Partial<Config> as any);
    await fs.unlink(path.join(tmpdir, 'a.js'));
    await fs.unlink(path.join(tmpdir, 'b.js'));
    await fs.unlink(path.join(tmpdir, 'buildInfo.json'));
    const { stdout } = await execFile(process.execPath, [path.join(tmpdir, 'compiled.js')]);
    const parsed = JSON.parse(stdout);
    expect(parsed.main).to.equal('it works!');
    expect(parsed.buildInfo.segmentApiKey).to.equal('...segment-key...');
    expect(parsed.buildInfo.buildArch).to.equal(os.arch());
    expect(parsed.buildInfo.buildPlatform).to.equal(os.platform());
    expect(parsed.buildInfo.buildTime).to.be.a('string');
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
    await generateBundle({
      input: path.join(tmpdir, 'b.js'),
      execInput: path.join(tmpdir, 'compiled.js'),
      buildInfoFilePath: path.join(tmpdir, 'buildInfo.json'),
      segmentKey: '...segment-key...'
    } as Partial<Config> as any);
    const { stdout } = await execFile(process.execPath, [path.join(tmpdir, 'compiled.js')]);
    expect(stdout.trim()).to.equal('cjs');
  });

  it('picks the .js module if main is a .cjs file because parcel cannot handle .cjs properly', async() => {
    const pkg = path.join(tmpdir, 'node_modules', 'some-fake-module');
    await fs.mkdir(pkg, { recursive: true });
    await fs.writeFile(path.join(pkg, 'package.json'), '{"main":"./cjs.cjs","module":"./plain.js"}');
    await fs.writeFile(path.join(pkg, 'cjs.cjs'), 'module.exports = "cjs"');
    await fs.writeFile(path.join(pkg, 'plain.js'), 'module.exports = "plain"');
    await fs.writeFile(path.join(tmpdir, 'b.js'), `
      console.log(require("some-fake-module"));
      `);
    await generateBundle({
      input: path.join(tmpdir, 'b.js'),
      execInput: path.join(tmpdir, 'compiled.js'),
      buildInfoFilePath: path.join(tmpdir, 'buildInfo.json'),
      segmentKey: '...segment-key...'
    } as Partial<Config> as any);
    const { stdout } = await execFile(process.execPath, [path.join(tmpdir, 'compiled.js')]);
    expect(stdout.trim()).to.equal('plain');
  });
});
