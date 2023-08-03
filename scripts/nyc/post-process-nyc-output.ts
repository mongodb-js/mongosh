import * as path from 'path';
import { transformCoverageFiles } from './transform-coverage';

const projectRoot = path.resolve(__dirname, '..', '..');
transformCoverageFiles(
  projectRoot,
  'keep',
  (p) => {
    if (p.startsWith(projectRoot)) {
      return p.replace(projectRoot, '');
    }
    else {
      console.log(`${p} does not start with ${projectRoot}`);
      return p;
    }
  }
);