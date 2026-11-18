import { expect } from 'chai';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { generateShrinkwrap } from './generate-shrinkwrap';
import { PROJECT_ROOT } from './constants';

describe('generate-shrinkwrap', function () {
  this.timeout(120_000); // npm install --package-lock-only can be slow

  let tmpPackageDir: string;

  beforeEach(async function () {
    // Create a temp directory to act as the target package directory.
    // Copy the real cli-repl package.json into it so generateShrinkwrap
    // reads real data but writes the shrinkwrap to a disposable location.
    tmpPackageDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'mongosh-shrinkwrap-test-')
    );
    const realPkgJson = await fs.readFile(
      path.join(PROJECT_ROOT, 'packages', 'cli-repl', 'package.json'),
      'utf8'
    );
    await fs.writeFile(path.join(tmpPackageDir, 'package.json'), realPkgJson);
  });

  afterEach(async function () {
    await fs.rm(tmpPackageDir, { recursive: true, force: true });
  });

  it('generates a valid shrinkwrap from the real monorepo lockfile', async function () {
    await generateShrinkwrap(tmpPackageDir, PROJECT_ROOT);

    const shrinkwrapPath = path.join(tmpPackageDir, 'npm-shrinkwrap.json');
    const content = await fs.readFile(shrinkwrapPath, 'utf8');
    const shrinkwrap = JSON.parse(content);

    // Top-level structure
    expect(shrinkwrap.name).to.equal('@mongosh/cli-repl');
    expect(shrinkwrap.version).to.be.a('string');
    expect(shrinkwrap.lockfileVersion).to.equal(3);
    expect(shrinkwrap.requires).to.equal(true);
    expect(shrinkwrap.packages).to.be.an('object');

    const packages: Record<string, any> = shrinkwrap.packages;
    const keys = Object.keys(packages);

    // Must have a root entry
    expect(packages).to.have.property('');

    // Must have at least some dependencies
    expect(keys.length).to.be.greaterThan(10);

    // Every non-root key must be under node_modules/ (no workspace paths)
    for (const key of keys) {
      if (key === '') continue;
      expect(key).to.match(
        /^node_modules\//,
        `unexpected workspace path entry: "${key}"`
      );
    }

    // No entry should have dev: true
    for (const [key, entry] of Object.entries(packages)) {
      if (key === '') continue;
      expect(entry.dev, `"${key}" should not be dev-only`).to.not.equal(true);
    }

    // No entry should still be a workspace link
    for (const [key, entry] of Object.entries(packages)) {
      if (key === '') continue;
      expect(
        entry.link,
        `"${key}" should not be a workspace link`
      ).to.not.equal(true);
    }

    // Workspace packages that cli-repl depends on should be present
    // as converted entries (with version, no link flag)
    const cliReplPkg = JSON.parse(
      await fs.readFile(
        path.join(PROJECT_ROOT, 'packages', 'cli-repl', 'package.json'),
        'utf8'
      )
    );
    const mongoshDeps = Object.keys(cliReplPkg.dependencies || {}).filter(
      (d: string) => d.startsWith('@mongosh/')
    );
    for (const dep of mongoshDeps) {
      const entry = packages[`node_modules/${dep}`];
      expect(entry, `workspace dep "${dep}" should be present`).to.exist;
      expect(entry.version, `"${dep}" should have a version`).to.be.a('string');
    }
  });

  it('honors root overrides without needing the registry', async function () {
    const emptyCache = await fs.mkdtemp(
      path.join(os.tmpdir(), 'mongosh-shrinkwrap-cache-')
    );
    const originalCache = process.env.npm_config_cache;
    process.env.npm_config_cache = emptyCache;
    try {
      await generateShrinkwrap(tmpPackageDir, PROJECT_ROOT);
    } finally {
      if (originalCache === undefined) delete process.env.npm_config_cache;
      else process.env.npm_config_cache = originalCache;
      await fs.rm(emptyCache, { recursive: true, force: true });
    }

    const shrinkwrap = JSON.parse(
      await fs.readFile(path.join(tmpPackageDir, 'npm-shrinkwrap.json'), 'utf8')
    );
    expect(shrinkwrap.packages['']).to.not.have.property('overrides');
    const rootPkg = JSON.parse(
      await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8')
    );
    const overridden = shrinkwrap.packages['node_modules/basic-ftp'];
    expect(overridden.version).to.satisfy((v: string) =>
      require('semver').satisfies(v, rootPkg.overrides['basic-ftp'])
    );
  });
});
