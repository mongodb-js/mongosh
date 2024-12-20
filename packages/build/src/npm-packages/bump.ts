import { spawnSync } from '../helpers';
import { PROJECT_ROOT } from './constants';

export function bumpNpmPackages() {
  spawnSync('npm', ['run', 'bump-packages'], {
    stdio: 'inherit',
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
    },
  });
}
