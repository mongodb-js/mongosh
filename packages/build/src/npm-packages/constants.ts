import path from 'path';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
export const LERNA_BIN = path.resolve(
  PROJECT_ROOT,
  'node_modules',
  '.bin',
  'lerna'
);
