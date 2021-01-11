import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs-extra';
import path from 'path';
import { expect, useTmpdir } from '../../../cli-repl/test/repl-helpers';
import { updateMongoDBTap } from './update-mongodb-tap';

describe('Homebrew update-mongodb-tap', () => {
  const repoDir = useTmpdir();
  const tmpDir = useTmpdir();

  let mongoBrewFormulaDir: string;
  let mongoshFormulaFile: string;

  beforeEach(() => {
    execSync('git init', { cwd: repoDir.path });

    mongoBrewFormulaDir = path.resolve(repoDir.path, 'Formula');
    mongoshFormulaFile = path.resolve(mongoBrewFormulaDir, 'mongosh.rb');

    execSync(`mkdir -p ${mongoBrewFormulaDir}`);
    writeFileSync(mongoshFormulaFile, 'formula', 'utf-8');
    execSync('git add . && git commit -m "add mongosh formula"', { cwd: repoDir.path });
  });

  it('writes updated formula and pushes changes', async() => {
    const updated = await updateMongoDBTap({
      tmpDir: tmpDir.path,
      packageVersion: '1.0.0',
      packageSha: 'sha',
      homebrewFormula: 'updated formula',
      mongoHomebrewRepoUrl: `file://${repoDir.path}`
    });
    expect(updated).to.equal(true);

    execSync('git checkout mongosh-1.0.0-sha', { cwd: repoDir.path });
    expect(readFileSync(mongoshFormulaFile, 'utf-8')).to.equal('updated formula');
  });

  it('does not push changes if formula is same', async() => {
    const updated = await updateMongoDBTap({
      tmpDir: tmpDir.path,
      packageVersion: '1.0.0',
      packageSha: 'sha',
      homebrewFormula: 'formula',
      mongoHomebrewRepoUrl: `file://${repoDir.path}`
    });
    expect(updated).to.equal(false);

    const branches = execSync('git branch -a', { cwd: repoDir.path }).toString().trim();
    expect(branches).to.equal('* master');
  });
});
