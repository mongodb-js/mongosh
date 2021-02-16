import path from 'path';

export const PLACEHOLDER_VERSION = '0.0.0-dev.0';
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
export const LERNA_BIN = path.resolve(PROJECT_ROOT, 'node_modules', '.bin', 'lerna');
