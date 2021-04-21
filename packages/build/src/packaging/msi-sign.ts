import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync as spawnSyncFn } from '../helpers';

const DEFAULT_OPTIONS: Partial<NotarizeMsiOptions> = {
  serverUrl: 'http://notary-service.build.10gen.cc:5000/',
  clientPath: 'C:\\cygwin\\usr\\local\\bin\\notary-client.py',
  pythonExecutable: 'python'
};

export interface NotarizeMsiOptions {
  signingKeyName: string;
  authToken: string;
  signingComment: string;
  serverUrl?: string;
  clientPath?: string;
  pythonExecutable?: string;
}

export async function notarizeMsi(
  file: string,
  opts: NotarizeMsiOptions,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  if (!file) {
    throw new Error('notarize MSI: missing file');
  }
  const options = validateOptions(opts);

  const authTokenFile = path.join(os.homedir(), '.notary-mongosh-token.tmp');
  await fs.writeFile(authTokenFile, options.authToken, {
    encoding: 'utf8'
  });

  try {
    spawnSync(options.pythonExecutable, [
      options.clientPath,
      '--key-name', options.signingKeyName,
      '--auth-token-file', authTokenFile,
      '--comment', options.signingComment,
      '--notary-url', options.serverUrl,
      '--outputs', 'sig',
      '--package-file-suffix', '',
      file
    ], {
      cwd: path.dirname(file),
      encoding: 'utf8'
    });
  } finally {
    try {
      await fs.unlink(authTokenFile);
    } catch (e) {
      console.error('mongosh: Failed to remove auth token file', e);
    }
  }
}

function validateOptions(options: NotarizeMsiOptions): Required<NotarizeMsiOptions> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options
  };
  if (!opts.signingKeyName) {
    throw new Error('notarize MSI: missing signing key name');
  }
  if (!opts.authToken) {
    throw new Error('notarize MSI: missing auth token');
  }
  if (!opts.signingComment) {
    throw new Error('notarize MSI: missing signing comment');
  }
  return opts as Required<NotarizeMsiOptions>;
}
