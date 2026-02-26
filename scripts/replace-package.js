// Example:
// REPLACE_PACKAGE=mongodb:latest node scripts/replace-package.js
// will replace the 'mongodb' dep's version with latest in the root directory
// and all packages.
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const replacement = process.env.REPLACE_PACKAGE;
if (!replacement) {
  throw new Error('REPLACE_PACKAGE missing from environment');
}
const parsed = replacement.trim().match(/^(?<from>[^:]+):(?<to>.+)$/);
if (!parsed || !parsed.groups.from || !parsed.groups.to) {
  throw new Error('Invalid format for REPLACE_PACKAGE');
}

function resolveTag(from, to) {
  return execSync(`pnpm dist-tag ls '${from}@${to}' | awk -F ': ' '/^${to}/ {print \$2}'`).toString().trim();
}

const { from, to: _to } = parsed.groups;

// pnpm install doesn't seem to do anything if you're updating a
// pnpm-lock.yaml file that already has the dep to a tag like nightly, but it
// does do something if you change it to the exact version.
const to = _to === 'nightly' ? resolveTag(from, _to) : _to;

for (const dir of ['.', ...fs.readdirSync('packages').map(dir => path.join('packages', dir))]) {
  const packageJson = path.join(dir, 'package.json');
  if (fs.existsSync(packageJson)) {
    const contents = JSON.parse(fs.readFileSync(packageJson));
    for (const deps of [
      contents.dependencies,
      contents.devDependencies,
      contents.optionalDependencies
    ]) {
      if (deps && deps[from]) {
        console.info(`Replacing deps[${from}]: ${deps[from]} with ${to}`);
        deps[from] = to;
      }
    }
    fs.writeFileSync(packageJson, JSON.stringify(contents, null, '  ') + '\n');
  }
}
