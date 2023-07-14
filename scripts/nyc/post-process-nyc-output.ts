import assert from 'assert';
import * as path from 'path';
import { transformCoverageFiles } from './transform-coverage';

const projectRoot = path.resolve(__dirname, '..', '..');
transformCoverageFiles(
  projectRoot,
  (p) => {
    assert.ok(p.startsWith(projectRoot), `${p} must start with ${projectRoot}`);
    return p.replace(projectRoot, '');
  }
);