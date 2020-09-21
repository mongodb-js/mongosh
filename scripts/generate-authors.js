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
    `git log --format='%aN <%aE>' --use-mailmap -- ${packagePath}`,
    { cwd: packageRootPath }
  ).toString().trim().split('\n');
}

function getAuthorsOrderedByCommitNumber(packagePath) {
  const authorsMap = {};

  for (const authorName of getAuthorsGitLog(packagePath)) {
    authorsMap[authorName] =  authorName in authorsMap ? authorsMap[authorName] + 1 : 1;
  }

  const compareAuthors = ([name1, commitCount1], [name2, commitCount2]) => {
    if (commitCount1 === commitCount2) {
      return (name1 > name2) ? 1: -1;
    }

    return commitCount1 > commitCount2 ? -1 : 1;
  };

  const authors = Object.entries(authorsMap)
    .sort(compareAuthors)
    .map(([name]) => {
      return name;
    });

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
  const authors = getAuthorsOrderedByCommitNumber(packagePath);
  fs.writeFileSync(path.resolve(packagePath, 'AUTHORS'), renderAuthorsFileContent(authors));
}

fs.writeFileSync(
  path.resolve(packageRootPath, 'AUTHORS'),
  renderAuthorsFileContent(getAuthorsOrderedByCommitNumber('.'))
);
