#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

process.on('unhandledRejection', (err) => {
  console.error();
  console.error(err?.stack || err?.message || err);
  process.exitCode = 1;
});

async function main() {
  if (process.env.CI) return;

  const monorepoRoot = path.resolve(__dirname, '..');

  const packageJSON = JSON.parse(await fs.readFile(
    path.join(monorepoRoot, 'package.json'),
    'utf8'
  ));

  // should use the scopes in lerna.json
  const { stdout } = await exec('npx -y lerna ls --all --toposort --json');
  packageJSON.workspaces = JSON.parse(stdout).map(({ location }) => path.relative(monorepoRoot, location));

  await fs.writeFile(
    path.join(monorepoRoot, 'package.json'),
    JSON.stringify(packageJSON, null, 2) + '\n',
    'utf8'
  );
}

main().catch((err) =>
  process.nextTick(() => {
    throw err;
  })
);
