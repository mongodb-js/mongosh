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
    mongoHomebrewRepoUrl?: string;
}

export async function updateMongoDBTap(params: UpdateMongoDBTapParameters): Promise<boolean> {
  const repoUrl = params.mongoHomebrewRepoUrl || 'git@github.com:mongodb/homebrew-brew.git';
  const cloneDir = path.resolve(params.tmpDir, 'homebrew-brew');
  cloneRepository(cloneDir, repoUrl);

  const branchName = `mongosh-${params.packageVersion}-${params.packageSha}`;
  execSync(`git checkout -b ${branchName}`, { cwd: cloneDir, stdio: 'inherit' });

  const formulaPath = path.resolve(cloneDir, 'Formula', 'mongosh.rb');

  const currentContent = await fs.readFile(formulaPath, 'utf-8');
  if (currentContent === params.homebrewFormula) {
    console.warn('There are no changes to the homebrew formula');
    return false;
  }

  await fs.writeFile( formulaPath, params.homebrewFormula, 'utf-8');

  execSync('git add .', { cwd: cloneDir, stdio: 'inherit' });
  execSync(`git commit -m "mongosh ${version}"`, { cwd: cloneDir, stdio: 'inherit' });
  execSync(`git push origin ${branchName}`, { cwd: cloneDir, stdio: 'inherit' });
  return true;
}
