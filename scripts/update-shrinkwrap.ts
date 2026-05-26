import path from 'path';
import { generateShrinkwrapForReleasePackages } from '../packages/build/src/npm-packages/generate-shrinkwrap';

const projectRoot = path.resolve(__dirname, '..');

generateShrinkwrapForReleasePackages(projectRoot).catch((err) => {
  console.error(err);
  process.exit(1);
});

