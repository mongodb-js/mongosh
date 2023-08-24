import type { GithubRepo } from '@mongodb-js/devtools-github-repo';

export interface UpdateHomebrewParameters {
  packageVersion: string;
  packageSha: string;
  homebrewFormula: string;
  homebrewCore: GithubRepo;
  homebrewCoreFork: GithubRepo;
  isDryRun: boolean;
}

/**
 * Updates the mongosh formula in the given homebrew repository and returns the
 * name of the branch pushed to the repository.
 */
export async function updateHomebrewFork(
  params: UpdateHomebrewParameters
): Promise<string | undefined> {
  const branchName = `mongosh-${params.packageVersion}-${params.packageSha}`;
  const formulaPath = 'Formula/m/mongosh.rb';

  const { content: currentContent, blobSha } =
    await params.homebrewCore.getFileContent(formulaPath, 'master');
  if (currentContent === params.homebrewFormula) {
    return undefined;
  }

  const homebrewMaster = await params.homebrewCore.getBranchDetails('master');
  await params.homebrewCoreFork.createBranch(
    branchName,
    homebrewMaster.object.sha
  );

  const committedUpdate = await params.homebrewCoreFork.commitFileUpdate(
    `mongosh ${params.packageVersion}`,
    blobSha,
    formulaPath,
    params.homebrewFormula,
    branchName
  );
  console.info(
    `Committed Formula update to homebrew - commit SHA: ${committedUpdate.commitSha}, branch: ${branchName}`
  );
  return branchName;
}
