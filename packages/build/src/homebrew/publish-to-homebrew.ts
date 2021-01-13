import { GithubRepo } from '../github-repo';
import { generateFormula } from './generate-formula';
import { updateMongoDBTap } from './update-mongodb-tap';
import { httpsSha256 } from './utils';


export async function publishToHomebrew(
  mongoHomebrewGithubRepo: GithubRepo, packageVersion: string,
  httpsSha256Fn = httpsSha256,
  generateFormulaFn = generateFormula,
  updateMongoDBTapFn = updateMongoDBTap
): Promise<void> {
  const cliReplPackageUrl = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${packageVersion}.tgz`;
  const packageSha = await httpsSha256Fn(cliReplPackageUrl);

  const homebrewFormula = generateFormulaFn({ version: packageVersion, sha: packageSha });
  const tapBranch = await updateMongoDBTapFn({
    packageVersion, packageSha, homebrewFormula, mongoHomebrewGithubRepo
  });

  if (!tapBranch) {
    console.warn('There are no changes to the homebrew formula');
    return;
  }

  const pr = await mongoHomebrewGithubRepo.createPullRequest(`mongosh ${packageVersion}`, tapBranch, 'master');
  console.info(`Created PR #${pr.prNumber} in mongodb/homebrew-brew: ${pr.url}`);
  await mongoHomebrewGithubRepo.mergePullRequest(pr.prNumber);
  console.info('-> Merged, homebrew formula is released');

  try {
    await mongoHomebrewGithubRepo.deleteBranch(tapBranch);
  } catch (e) {
    console.warn(`!! Failed to automatically clean up branch ${tapBranch}, please do so manually`);
  }
}
