import semver from 'semver';
import { spawnSync as spawnSyncFn } from '../helpers';

export interface TaggedCommit {
  commit: string;
  tag: TagDetails;
}

export interface TagDetails {
  semverName: string;
  releaseVersion: string;
  draftVersion: number | undefined;
}

export interface ReleaseVersion {
  major: number | undefined;
  minor: number | undefined;
  patch: number | undefined;
}

export function getLatestDraftOrReleaseTagFromLog(
  repositoryRoot: string,
  versionRestriction: ReleaseVersion | undefined,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): TaggedCommit | undefined {
  const gitTags = spawnSync('git', ['tag'], {
    cwd: repositoryRoot,
    encoding: 'utf-8',
  });

  const tagDetails = extractTags(
    gitTags.stdout.split('\n'),
    versionRestriction
  );
  const sortedTagsWithCommit = tagDetails.sort((t1, t2) => {
    return -1 * semver.compare(t1.semverName, t2.semverName);
  });

  if (!sortedTagsWithCommit.length) {
    return undefined;
  }

  const tag = sortedTagsWithCommit[0];
  const gitLog = spawnSync(
    'git',
    ['log', '-n1', '--pretty=%H', `v${tag.semverName}`],
    {
      cwd: repositoryRoot,
      encoding: 'utf-8',
    }
  );

  return {
    commit: gitLog.stdout.trim(),
    tag,
  };
}

function extractTags(
  gitTags: string[],
  versionRestriction: ReleaseVersion | undefined
): TagDetails[] {
  const validTags = gitTags
    .map((tag) => semver.valid(tag))
    .filter((v) => !!v) as string[];

  return validTags
    .map((semverTag) => {
      const prerelease = semver.prerelease(semverTag);
      if (prerelease && prerelease[0] !== 'draft') {
        return undefined;
      }

      const major = semver.major(semverTag);
      const minor = semver.minor(semverTag);
      const patch = semver.patch(semverTag);

      if (versionRestriction?.major !== undefined) {
        if (major !== versionRestriction.major) {
          return undefined;
        }
        if (versionRestriction.minor !== undefined) {
          if (minor !== versionRestriction.minor) {
            return undefined;
          }
          if (
            versionRestriction.patch !== undefined &&
            versionRestriction.patch !== patch
          ) {
            return undefined;
          }
        }
      }

      return {
        semverName: semverTag,
        releaseVersion: `${major}.${minor}.${patch}`,
        draftVersion: prerelease
          ? parseInt(String(prerelease[1]), 10)
          : undefined,
      };
    })
    .filter((t) => !!t) as TagDetails[];
}
