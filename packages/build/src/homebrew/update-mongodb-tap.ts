import { execSync } from 'child_process';
import { version } from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { cloneRepository } from './utils';

export interface UpdateMongoDBTapParameters {
    packageVersion: string;
    packageSha: string;
    homebrewFormula: string;
    tmpDir: string;
    mongoHomebrewRepoUrl: string;
}

/**
 * Updates the mongosh formula in the given homebrew tap repository and returns the
 * name of the branch pushed to the repository.
 */
export async function updateMongoDBTap(params: UpdateMongoDBTapParameters): Promise<string | undefined> {
  const repoUrl = params.mongoHomebrewRepoUrl;
  const cloneDir = path.resolve(params.tmpDir, 'homebrew-brew');
  cloneRepository(cloneDir, repoUrl);

  const branchName = `mongosh-${params.packageVersion}-${params.packageSha}`;
  execSync(`git checkout -b ${branchName}`, { cwd: cloneDir, stdio: 'inherit' });

  const formulaPath = path.resolve(cloneDir, 'Formula', 'mongosh.rb');

  const currentContent = await fs.readFile(formulaPath, 'utf-8');
  if (currentContent === params.homebrewFormula) {
    return undefined;
  }

  await fs.writeFile( formulaPath, params.homebrewFormula, 'utf-8');

  execSync('git add .', { cwd: cloneDir, stdio: 'inherit' });
  execSync(`git commit -m "mongosh ${version}"`, { cwd: cloneDir, stdio: 'inherit' });
  execSync(`git push origin ${branchName}`, { cwd: cloneDir, stdio: 'inherit' });
  return branchName;
}
