import * as path from 'path';
import { transformCoverageFiles } from './transform-coverage';

const projectRoot = path.resolve(__dirname, '..', '..');
transformCoverageFiles(
  projectRoot,
  p => p.replace(projectRoot, '')
);