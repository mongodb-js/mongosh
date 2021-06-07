import * as semver from 'semver';
import { GithubRepo } from '../github-repo';

export async function generateUpdatedFormula(
  context: { version: string, sha: string },
  homebrewCoreFork: GithubRepo
): Promise<string | null> {
  const currentFormula = await homebrewCoreFork.getFileContent('Formula/mongosh.rb', 'master');

  const urlMatch = /url \"([^"]+)\"/g.exec(currentFormula.content);
  const shaMatch = /sha256 \"([^"]+)\"/g.exec(currentFormula.content);

  if (!urlMatch || !shaMatch) {
    throw new Error('mongosh: could not find url or sha field in homebrew/core formula');
  }

  const currentUrl = urlMatch[1];
  const currentSha = shaMatch[1];

  const newUrl = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${context.version}.tgz`;
  if (currentUrl === newUrl && currentSha === context.sha) {
    console.info('mongosh: homebrew formula URL and SHA did not change');
    return null;
  }

  const currentVersion = /cli-repl-(\d+\.\d+\.\d+)\.tgz/.exec(currentUrl)?.[1];
  if (currentVersion && semver.compare(currentVersion, context.version, { includePrerelease: true }) !== -1) {
    throw new Error(`mongosh: new version ${context.version} is lower than or equal to current published version ${currentVersion}`);
  }

  let newFormula = currentFormula.content;
  newFormula = newFormula.replace(/url \"([^"]+)\"/g, `url "${newUrl}"`);
  newFormula = newFormula.replace(/sha256 \"([^"]+)\"/g, `sha256 "${context.sha}"`);
  return newFormula;
}
