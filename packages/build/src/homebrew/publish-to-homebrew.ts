import { GithubRepo } from '../github-repo';
import { generateFormula } from './generate-formula';
import { updateMongoDBTap } from './update-mongodb-tap';
import { httpsSha256 } from './utils';

const MONGO_HOMEBREW_REPO_URL = 'git@github.com:mongodb/homebrew-brew.git';

export async function publishToHomebrew(tmpDir: string, mongoHomebrewRepo: GithubRepo, packageVersion: string): Promise<void> {
  const cliReplPackageUrl = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${packageVersion}.tgz`;
  const packageSha = await httpsSha256(cliReplPackageUrl);

  const homebrewFormula = generateFormula({ version: packageVersion, sha: packageSha });
  const tapBranch = await updateMongoDBTap({
    tmpDir, packageVersion, packageSha, homebrewFormula,
    mongoHomebrewRepoUrl: MONGO_HOMEBREW_REPO_URL
  });

  if (!tapBranch) {
    console.warn('There are no changes to the homebrew formula');
    return;
  }

  const pr = await mongoHomebrewRepo.createPullRequest(`mongosh ${packageVersion}`, tapBranch, 'master');
  console.info(`Created PR #${pr.prNumber} in mongodb/homebrew-brew: ${pr.url}`);
  await mongoHomebrewRepo.mergePullRequest(pr.prNumber);
  console.info('-> Merged, homebrew formula is released');
}
