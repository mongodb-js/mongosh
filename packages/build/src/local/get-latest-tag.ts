import semver from 'semver';
import { spawnSync as spawnSyncFn } from '../helpers';

export interface TaggedCommit {
  commit: string;
  tag: TagDetails
}

export interface TagDetails {
    semverName: string;
    releaseVersion: string;
    draftVersion: number | undefined;
}

export function getLatestDraftOrReleaseTagFromLog(
  repositoryRoot: string,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): TaggedCommit | undefined {
  const gitTags = spawnSync('git', ['tag'], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });

  const tagDetails = extractTags(gitTags.stdout.split('\n'));
  const sortedTagsWithCommit = tagDetails.sort((t1, t2) => {
    return -1 * semver.compare(t1.semverName, t2.semverName);
  });

  if (!sortedTagsWithCommit.length) {
    return undefined;
  }

  const tag = sortedTagsWithCommit[0];
  const gitLog = spawnSync('git', ['log', '-n1', '--pretty=%H', `v${tag.semverName}`], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });

  return {
    commit: gitLog.stdout.trim(),
    tag
  };
}

function extractTags(gitTags: string[]): TagDetails[] {
  const validTags = gitTags
    .map(tag => semver.valid(tag))
    .filter(v => !!v) as string[];

  return validTags.map(semverTag => {
    const prerelease = semver.prerelease(semverTag);
    if (prerelease && prerelease[0] !== 'draft') {
      return undefined;
    }

    return {
      semverName: semverTag,
      releaseVersion: `${semver.major(semverTag)}.${semver.minor(semverTag)}.${semver.patch(semverTag)}`,
      draftVersion: prerelease ? parseInt(prerelease[1], 10) : undefined
    };
  }).filter(t => !!t) as TagDetails[];
}
