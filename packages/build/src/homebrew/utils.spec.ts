import { execSync } from 'child_process';
import { expect, useTmpdir } from '../../../cli-repl/test/repl-helpers';
import { cloneRepository } from './utils';

describe('Homebrew Utils', () => {
  const repoDir = useTmpdir();
  const tmpDir = useTmpdir();

  beforeEach(() => {
    execSync('git init', { cwd: repoDir.path });
    execSync('touch empty.txt', { cwd: repoDir.path });
    execSync('git add . && git commit -m "commit1"', { cwd: repoDir.path });
    execSync('touch another.txt', { cwd: repoDir.path });
    execSync('git add . && git commit -m "commit2"', { cwd: repoDir.path });
  });

  describe('cloneRepository', () => {
    it('clones shallow as requested', () => {
      cloneRepository(tmpDir.path, `file://${repoDir.path}`);
      const output = execSync('git log -2 --oneline', { cwd: tmpDir.path }).toString();
      const lines = output.split('\n').filter(l => !!l);
      expect(lines.length).to.equal(1);
      expect(lines[0]).to.match(/ commit2$/);
    });
  });
});
