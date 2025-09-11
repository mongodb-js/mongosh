import path from 'path';
import { promises as fs, constants as fsConstants } from 'fs';
import type { MongoshBus } from '@mongosh/types';

export const SHARED_LIBRARY_SUFFIX =
  process.platform === 'win32'
    ? 'dll'
    : process.platform === 'darwin'
    ? 'dylib'
    : 'so';

export interface CryptLibraryPathResult {
  cryptSharedLibPath?: string;
  expectedVersion?: { version: bigint; versionStr: string };
}

/**
 * Figure out the possible shared library paths for the CSFLE shared library
 * that we are supposed to use.
 */
export async function getCryptLibraryPaths(
  bus: MongoshBus | undefined = undefined,
  pretendProcessExecPathForTesting: string | undefined = undefined
): Promise<CryptLibraryPathResult> {
  const execPath = pretendProcessExecPathForTesting ?? process.execPath;

  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let getCryptSharedLibraryVersion: typeof import('mongodb-crypt-library-version');
  try {
    getCryptSharedLibraryVersion = require('mongodb-crypt-library-version');
  } catch (err) {
    getCryptSharedLibraryVersion = () => ({
      version: BigInt(0),
      versionStr: '<unknown>',
    });
  }

  if (execPath === process.argv[1] || pretendProcessExecPathForTesting) {
    const bindir = path.dirname(execPath);
    const execPathStat = await fs.stat(execPath);
    for await (const libraryCandidate of [
      // Locations of the shared library in the deb and rpm packages
      path.resolve(
        bindir,
        '..',
        'lib64',
        `mongosh_crypt_v1.${SHARED_LIBRARY_SUFFIX}`
      ),
      path.resolve(
        bindir,
        '..',
        'lib',
        `mongosh_crypt_v1.${SHARED_LIBRARY_SUFFIX}`
      ),
      // Location of the shared library in the zip and tgz packages
      path.resolve(bindir, `mongosh_crypt_v1.${SHARED_LIBRARY_SUFFIX}`),
    ]) {
      try {
        const permissionsMismatch = await ensureMatchingPermissions(
          libraryCandidate,
          execPathStat
        );
        if (permissionsMismatch) {
          bus?.emit?.('mongosh:crypt-library-load-skip', {
            cryptSharedLibPath: libraryCandidate,
            reason: 'permissions mismatch',
            details: permissionsMismatch,
          });
          continue;
        }

        const version = getCryptSharedLibraryVersion(libraryCandidate);
        const result = {
          cryptSharedLibPath: libraryCandidate,
          expectedVersion: version,
        };
        bus?.emit?.('mongosh:crypt-library-load-found', result);
        return result;
      } catch (err: any) {
        bus?.emit?.('mongosh:crypt-library-load-skip', {
          cryptSharedLibPath: libraryCandidate,
          reason: err.message,
        });
      }
    }
  } else {
    bus?.emit?.('mongosh:crypt-library-load-skip', {
      cryptSharedLibPath: '',
      reason:
        'Skipping CSFLE library searching because this is not a single-executable mongosh',
    });
  }
  return {};
}

// Check whether permissions for a file match what we expect them to be.
// Returns 'null' in case of no mismatch and information that is useful
// for debugging/logging in the mismatch case.
async function ensureMatchingPermissions(
  filename: string,
  execPathStat: { uid: number; gid: number }
): Promise<null | object> {
  if (process.platform === 'win32') {
    // On Windows systems, there are no permissions checks that
    // we could reasonably do here.
    return null;
  }
  await fs.access(filename, fsConstants.R_OK);
  const stat = await fs.stat(filename);
  // On UNIX systems, only load shared libraries if they are coming
  // from a user we can consider trusted (current user or the one who owns
  // the mongosh binary to begin with) and they are not writable by other
  // users.
  if (
    (stat.uid !== execPathStat.uid && stat.uid !== process.getuid?.()) ||
    (stat.gid !== execPathStat.gid && stat.gid !== process.getgid?.()) ||
    stat.mode & 0o002 /* world-writable */
  ) {
    return {
      libraryStat: { uid: stat.uid, gid: stat.gid, mode: stat.mode },
      mongoshStat: { uid: execPathStat.uid, gid: stat.gid },
      currentUser: { uid: process.getuid?.(), gid: process.getgid?.() },
    };
  }
  return null;
}
