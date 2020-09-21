#!/usr/bin/env node

/*
 * Generate an AUTHOR file on the repo root and on each lerna package based on git log.
 *
 * Add / change the ALIASES map to avoid duplications and show the correct names / emails.
 *
 * NOTE: Author lines with `users.noreply.github.com` emails are removed.
 */

const ALIASES = {
  'Anna Henningsen <anna.henningsen@mongodb.com>': 'Anna Henningsen <anna@addaleax.net>',
  'Anna Henningsen <addaleax@gmail.com>': 'Anna Henningsen <anna@addaleax.net>',
  'Anna Henningsen <github@addaleax.net>': 'Anna Henningsen <anna@addaleax.net>',
  'aherlihy <anna.herlihy@10gen.com>': 'Anna Herlihy <herlihyap@gmail.com>',
  'anna herlihy <anna.herlihy@10gen.com>': 'Anna Herlihy <herlihyap@gmail.com>',
  'Massimiliano Marcon <max.marcon@mongodb.com>': 'Massimiliano Marcon <me@marcon.me>',
  'mcasimir <maurizio.cas@gmail.com>': 'Maurizio Casimirri <maurizio.cas@gmail.com>',
}

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const packageRootPath = path.resolve(__dirname, '..');

function getAuthorsGitLog(packagePath) {
  return execSync(
    `bash -c "git log --format='%aN <%aE>' -- ${packagePath} | grep -v "users.noreply.github.com" | sort -f | uniq"`,
    { cwd: packageRootPath }
  ).toString().trim().split('\n');
}

function getAuthorsWithAliases(packagePath) {
  const authorsSet = new Set(
    getAuthorsGitLog(packagePath).map(author => (ALIASES[author] || author)
  ))

  return Array.from(authorsSet).sort();
}

function getAllPackages() {
  return JSON.parse(execSync(`lerna list -a --loglevel=error --json`,
  { cwd: packageRootPath }
  ).toString().trim());
}

function renderAuthorsFileContent(authors) {
  return `${authors.join('\n')}\n`;
}

const packages = getAllPackages();

for (const { location } of packages) {
  const packagePath = path.relative(packageRootPath, location);
  const authors = getAuthorsWithAliases(packagePath);
  fs.writeFileSync(path.resolve(packagePath, 'AUTHORS'), renderAuthorsFileContent(authors));
}

fs.writeFileSync(
  path.resolve(packageRootPath, 'AUTHORS'),
  renderAuthorsFileContent(getAuthorsWithAliases('.'))
);
