import { GithubRepo } from '../github-repo';

export interface UpdateMongoDBTapParameters {
    packageVersion: string;
    packageSha: string;
    homebrewFormula: string;
    mongoHomebrewGithubRepo: GithubRepo
}

/**
 * Updates the mongosh formula in the given homebrew tap repository and returns the
 * name of the branch pushed to the repository.
 */
export async function updateMongoDBTap(params: UpdateMongoDBTapParameters): Promise<string | undefined> {
  const branchName = `mongosh-${params.packageVersion}-${params.packageSha}`;
  const formulaPath = 'Formula/mongosh.rb';

  const { content: currentContent, blobSha } = await params.mongoHomebrewGithubRepo.getFileContent(formulaPath);
  if (currentContent === params.homebrewFormula) {
    return undefined;
  }

  const committedUpate = await params.mongoHomebrewGithubRepo.commitFileUpdate(
    `mongosh ${params.packageVersion}`,
    blobSha,
    formulaPath,
    params.homebrewFormula,
    branchName
  );
  console.info(`Committed Formula update to homebrew - commit SHA: ${committedUpate.commitSha}`);
  return branchName;
}
