import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync as spawnSyncFn } from '../helpers';

const DEFAULT_OPTIONS: Partial<NotarizeOptions> = {
  serverUrl: 'http://notary-service.build.10gen.cc:5000/',
  clientPath: process.platform === 'win32' ?
    'C:\\cygwin\\usr\\local\\bin\\notary-client.py' :
    '/usr/local/bin/notary-client.py',
  pythonExecutable: process.platform === 'win32' ? 'python' : '/usr/bin/python'
};

export interface NotarizeOptions {
  signingKeyName: string;
  authToken: string;
  signingComment: string;
  serverUrl?: string;
  clientPath?: string;
  pythonExecutable?: string;
}

export async function notarizeArtifact(
  file: string,
  opts: NotarizeOptions,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  if (!file) {
    throw new Error('notarize artifact: missing file');
  }
  const options = validateOptions(opts);

  const authTokenFile = path.join(os.homedir(), `.notary-mongosh-token.${Date.now()}.tmp`);
  await fs.writeFile(authTokenFile, options.authToken, {
    encoding: 'utf8',
    mode: 0o600
  });
  console.info('Notarizing file', options.signingKeyName, options.signingComment, file);

  try {
    spawnSync(options.pythonExecutable, [
      options.clientPath,
      '--key-name', options.signingKeyName,
      '--auth-token-file', authTokenFile,
      '--comment', options.signingComment,
      '--notary-url', options.serverUrl,
      '--outputs', 'sig',
      '--package-file-suffix', '',
      path.basename(file)
    ], {
      cwd: path.dirname(file),
      encoding: 'utf8'
    });
  } finally {
    try {
      await fs.unlink(authTokenFile);
    } catch (e: any) {
      console.error('mongosh: Failed to remove auth token file', e);
    }
  }
}

function validateOptions(options: NotarizeOptions): Required<NotarizeOptions> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  if (!opts.signingKeyName) {
    throw new Error('notarize artifact: missing signing key name');
  }
  if (!opts.authToken) {
    throw new Error('notarize artifact: missing auth token');
  }
  if (!opts.signingComment) {
    throw new Error('notarize artifact: missing signing comment');
  }
  return opts as Required<NotarizeOptions>;
}
