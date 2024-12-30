import { spawnSync } from '../helpers';
import { PROJECT_ROOT } from './constants';

const PACKAGES_TO_SKIP_BUMPING = ['mongosh', '@mongosh/cli-repl'];

export function bumpNpmPackages() {
  spawnSync('npx', ['bump-monorepo-packages'], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      SKIP_BUMP_PACKAGES: PACKAGES_TO_SKIP_BUMPING.join(','),
    },
  });
}
