import { execSync } from 'child_process';
import crypto from 'crypto';
import https from 'https';

export function httpsSha256(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (stream) => {
      const hash = crypto.createHash('sha256');
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  });
}

export function cloneRepository(cloneDir: string, repositoryUrl: string): void {
  execSync(`git clone "${repositoryUrl}" "${cloneDir}" --depth 1`, { stdio: 'inherit' });
}

