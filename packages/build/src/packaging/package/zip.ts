import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import {
  createCompressedArchiveContents,
  execFile as execFileFn,
} from './helpers';
import type { PackageInformation } from './package-information';

/**
 * The list of external tools that we can use to create a ZIP archive, in the
 * order in which we try them. Using these has the advantage of preserving
 * executable permissions as opposed to using libraries like adm-zip.
 *
 * `zip` is for the Evergreen macOS and 7-Zip for Windows.
 * If the Windows image ships 7-Zip without putting it on PATH,
 * we also try the two standard install locations as a fallback.
 */
function zipCommandCandidates(
  outFile: string
): { cmd: string; args: string[] }[] {
  return [
    { cmd: 'zip', args: ['-r', outFile, '.'] },
    { cmd: '7z', args: ['a', outFile, '.'] },
    {
      cmd: 'C:\\Program Files\\7-Zip\\7z.exe',
      args: ['a', outFile, '.'],
    },
    {
      cmd: 'C:\\Program Files (x86)\\7-Zip\\7z.exe',
      args: ['a', outFile, '.'],
    },
  ];
}

/**
 * Create a ZIP archive.
 */
export async function createZipPackage(
  pkg: PackageInformation,
  outFile: string,
  execFile: typeof execFileFn = execFileFn
): Promise<void> {
  const filename = path.basename(outFile).replace(/\.[^.]+$/, '');
  const tmpDir = await createCompressedArchiveContents(filename, pkg);
  const candidates = zipCommandCandidates(outFile);
  for (const [index, { cmd, args }] of candidates.entries()) {
    try {
      await execFile(cmd, args, { cwd: tmpDir });
      break;
    } catch (err: any) {
      // Only a missing binary makes us move on to the next candidate.
      // An actual failure of one of these tools is a genuine error.
      if (err?.code !== 'ENOENT' || index === candidates.length - 1) {
        throw err;
      }
    }
  }
  await promisify(rimraf)(tmpDir);
}
