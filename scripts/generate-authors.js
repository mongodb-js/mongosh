#!/usr/bin/env node

/*
 * Generate an AUTHOR file on the repo root and on each lerna package based on git log.
 *
 * Add / change aliases in .mailmap to avoid duplications and show the correct
 * names / emails.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const packageRootPath = path.resolve(__dirname, '..');



function getAuthorsGitLog(packagePath) {
  return execSync(
    `git log --reverse --format='%aN <%aE>' --use-mailmap -- ${packagePath}`,
    { cwd: packageRootPath }
  ).toString().trim().split('\n');
}

function getAuthorsOrderedByFirstCommit(packagePath) {
  const alreadyAdded = new Set();
  const authors = [];

  for (const authorName of getAuthorsGitLog(packagePath)) {
    if (alreadyAdded.has(authorName)) { continue; }
    alreadyAdded.add(authorName);
    authors.push(authorName);
  }

  return authors;
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
  const authors = getAuthorsOrderedByFirstCommit(packagePath);
  fs.writeFileSync(path.resolve(packagePath, 'AUTHORS'), renderAuthorsFileContent(authors));
}

fs.writeFileSync(
  path.resolve(packageRootPath, 'AUTHORS'),
  renderAuthorsFileContent(getAuthorsOrderedByFirstCommit('.'))
);
