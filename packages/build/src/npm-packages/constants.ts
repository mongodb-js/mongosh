import path from 'path';

export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
export const LERNA_BIN = path.resolve(
  PROJECT_ROOT,
  'node_modules',
  '.bin',
  'lerna'
);

/** Packages which get bumped only as part of the mongosh release. */
export const MONGOSH_RELEASE_PACKAGES = ['mongosh', '@mongosh/cli-repl'];

/** Packages which always get excluded when doing a release or bump */
export const EXCLUDE_RELEASE_PACKAGES = [
  '@mongodb-js/eslint-config-mongosh',
  '@mongodb-js/tsconfig-mongosh',
];
