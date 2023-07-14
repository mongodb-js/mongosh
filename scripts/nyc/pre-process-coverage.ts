import fs from 'fs';
import assert from 'assert';
import * as path from 'path';
import { transformCoverageFiles } from './transform-coverage';

const projectRoot = path.resolve(__dirname, '..', '..');
transformCoverageFiles(
  projectRoot,
  (p) => {
    const fullPath = projectRoot + p;
    assert.ok(fs.existsSync(fullPath), `${fullPath} must exist`);
    return fullPath;
  }
);