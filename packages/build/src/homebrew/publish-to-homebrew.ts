import { GithubRepo } from '@mongodb-js/devtools-github-repo';
import { generateUpdatedFormula } from './generate-formula';
import { updateHomebrewFork } from './update-homebrew-fork';
import { httpsSha256 } from './utils';


export async function publishToHomebrew(
  homebrewCore: GithubRepo,
  homebrewCoreFork: GithubRepo,
  packageVersion: string,
  githubReleaseLink: string,
  isDryRun: boolean,
  httpsSha256Fn = httpsSha256,
  generateFormulaFn = generateUpdatedFormula,
  updateHomebrewForkFn = updateHomebrewFork
): Promise<void> {
  const cliReplPackageUrl = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${packageVersion}.tgz`;
  const packageSha = isDryRun ?
    `dryRun-fakesha256-${Date.now()}` :
    await httpsSha256Fn(cliReplPackageUrl);

  const homebrewFormula = await generateFormulaFn(
    { version: packageVersion, sha: packageSha },
    homebrewCore,
    isDryRun
  );
  if (!homebrewFormula) {
    console.warn('There are no changes to the homebrew formula');
    return;
  }

  const forkBranch = await updateHomebrewForkFn({
    packageVersion, packageSha, homebrewFormula, homebrewCore, homebrewCoreFork, isDryRun
  });
  if (!forkBranch) {
    console.warn('There are no changes to the homebrew formula');
    return;
  }

  const description = `This PR was created automatically and bumps \`mongosh\` to the latest published version \`${packageVersion}\`.\n\nFor additional details see ${githubReleaseLink}.`;

  if (isDryRun) {
    await homebrewCoreFork.deleteBranch(forkBranch);
    console.warn('Deleted branch instead of creating homebrew PR');
    return;
  }
  const pr = await homebrewCore.createPullRequest(
    `mongosh ${packageVersion}`,
    description,
    `${homebrewCoreFork.repo.owner}:${forkBranch}`,
    'master'
  );
  console.info(`Created PR #${pr.prNumber} in ${homebrewCore.repo.owner}/${homebrewCore.repo.repo}: ${pr.url}`);
}
