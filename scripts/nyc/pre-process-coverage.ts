import fs from 'fs';
import * as path from 'path';
import { transformCoverageFiles } from './transform-coverage';

const projectRoot = path.resolve(__dirname, '..', '..');
transformCoverageFiles(
  projectRoot,
  'unify',
  (p) => {
    if (p.startsWith(projectRoot)) {
      // try and make this idempotent
      return p;
    }

    const fullPath = projectRoot + p;
    if (!fs.existsSync(fullPath)) {
      console.log(`${fullPath} does not exist`);
    }
    return fullPath;
  }
);