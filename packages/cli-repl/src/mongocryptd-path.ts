import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';

export async function getMongocryptdPath(): Promise<string | null> {
  const bindir = path.dirname(process.execPath);
  for await (const mongocryptdCandidate of [
    // Location of mongocryptd-mongosh in the deb and rpm packages
    path.resolve(bindir, '..', 'libexec', 'mongocryptd-mongosh'),
    // Location of mongocryptd-mongosh in the zip and tgz packages
    path.resolve(bindir, 'mongocryptd-mongosh'),
    path.resolve(bindir, 'mongocryptd-mongosh.exe')
  ]) {
    try {
      await fs.access(mongocryptdCandidate, fsConstants.X_OK);
      return mongocryptdCandidate;
    } catch { /* ignore error */ }
  }
  return null;
}
