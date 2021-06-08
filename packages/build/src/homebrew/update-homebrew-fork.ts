import { GithubRepo } from '../github-repo';

export interface UpdateHomebrewParameters {
    packageVersion: string;
    packageSha: string;
    homebrewFormula: string;
    homebrewCoreFork: GithubRepo
}

/**
 * Updates the mongosh formula in the given homebrew repository and returns the
 * name of the branch pushed to the repository.
 */
export async function updateHomebrewFork(params: UpdateHomebrewParameters): Promise<string | undefined> {
  const branchName = `mongosh-${params.packageVersion}-${params.packageSha}`;
  const formulaPath = 'Formula/mongosh.rb';

  const { content: currentContent, blobSha } = await params.homebrewCoreFork.getFileContent(formulaPath, 'master');
  if (currentContent === params.homebrewFormula) {
    return undefined;
  }

  await params.homebrewCoreFork.createBranch(branchName, 'master');
  const committedUpate = await params.homebrewCoreFork.commitFileUpdate(
    `mongosh ${params.packageVersion}`,
    blobSha,
    formulaPath,
    params.homebrewFormula,
    branchName
  );
  console.info(`Committed Formula update to homebrew - commit SHA: ${committedUpate.commitSha}, branch: ${branchName}`);
  return branchName;
}
