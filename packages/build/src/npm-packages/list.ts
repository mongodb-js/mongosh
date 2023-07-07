import { LERNA_BIN, PROJECT_ROOT } from './constants';
import { spawnSync } from '../helpers/spawn-sync';

export interface LernaPackageDescription {
  name: string;
  version: string;
  private: boolean;
  location: string;
}

export function listNpmPackages(): LernaPackageDescription[] {
  const lernaListOutput = spawnSync(LERNA_BIN, ['list', '--json', '--all'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  return JSON.parse(lernaListOutput.stdout);
}
