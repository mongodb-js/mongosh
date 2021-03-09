/* istanbul ignore file */
import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import { downloadMongoDb } from '../download-mongodb';

export async function downloadMongocrypt(): Promise<string> {
  console.info('mongosh: downloading latest mongocryptd for inclusion in package');
  const bindir = await downloadMongoDb(
    path.resolve(__dirname, '..', '..', '..', '..', 'tmp'),
    '*'); // Download mongodb for latest server version.
  let mongocryptd = path.join(bindir, 'mongocryptd');
  if (process.platform === 'win32') {
    mongocryptd += '.exe';
  }
  // Make sure that the binary exists and is executable.
  await fs.access(mongocryptd, fsConstants.X_OK);
  console.info('mongosh: downloaded', mongocryptd);
  return mongocryptd;
}
