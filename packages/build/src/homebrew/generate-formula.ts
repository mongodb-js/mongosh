import * as semver from 'semver';
import type { GithubRepo } from '@mongodb-js/devtools-github-repo';

/**
 * When sending requests via Octokit, a situation can arise where the server closes the connection,
 * but the client still believes it’s open and attempts to write to it,
 * what leads to receiving an EPIPE error from the OS, indicating the connection has already been closed.
 * In such cases, retrying the request can help establish a new, functional connection.
 */
async function getFileWithRetry(
  homebrewCore: GithubRepo,
  remainingRetries = 3
) {
  try {
    return await homebrewCore.getFileContent('Formula/m/mongosh.rb', 'master');
  } catch (error: any) {
    if (error.message.includes('EPIPE') && remainingRetries > 0) {
      return await getFileWithRetry(homebrewCore, remainingRetries - 1);
    } else {
      throw error;
    }
  }
}

export async function generateUpdatedFormula(
  context: { version: string; sha: string },
  homebrewCore: GithubRepo,
  isDryRun: boolean
): Promise<string | null> {
  const currentFormula = await getFileWithRetry(homebrewCore);

  const urlMatch = /url "([^"]+)"/g.exec(currentFormula.content);
  const shaMatch = /sha256 "([^"]+)"/g.exec(currentFormula.content);

  if (!urlMatch || !shaMatch) {
    throw new Error(
      'mongosh: could not find url or sha field in homebrew/core formula'
    );
  }

  const currentUrl = urlMatch[1];
  const currentSha = shaMatch[1];

  const newUrl = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${context.version}.tgz`;
  if (currentUrl === newUrl && currentSha === context.sha) {
    console.info('mongosh: homebrew formula URL and SHA did not change');
    return null;
  }

  const currentVersion = /cli-repl-(\d+\.\d+\.\d+)\.tgz/.exec(currentUrl)?.[1];
  if (
    currentVersion &&
    semver.compare(currentVersion, context.version, {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore 'includePrerelease' does not exist in type 'Options'.
      includePrerelease: true,
    }) !== -1 &&
    !isDryRun
  ) {
    throw new Error(
      `mongosh: new version ${context.version} is lower than or equal to current published version ${currentVersion}`
    );
  }

  let newFormula = currentFormula.content;
  newFormula = newFormula.replace(/url "([^"]+)"/g, `url "${newUrl}"`);
  newFormula = newFormula.replace(
    /sha256 "([^"]+)"/g,
    `sha256 "${context.sha}"`
  );
  return newFormula;
}
