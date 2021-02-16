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
  const gitLog = spawnSync('git', ['log', '--no-walk', '--tags', '--decorate', '--pretty=oneline'], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });

  const tagWithCommit = gitLog.stdout
    .split('\n')
    .map(l => l.trim())
    .map(extractTags)
    .flatMap(details => details?.tags.map(tag => ({
      commit: details.commit,
      tag
    }))) as TaggedCommit[];

  const sortedTagsWithCommit = tagWithCommit.sort((t1, t2) => {
    return -1 * semver.compare(t1.tag.semverName, t2.tag.semverName);
  });
  return sortedTagsWithCommit[0];
}

function extractTags(logLine: string): { commit: string, tags: TagDetails[] } | undefined {
  const commitAndTags = logLine.match(/^([^ ]+) \(([^)]+)\)/);
  if (!commitAndTags) {
    return undefined;
  }

  const commit = commitAndTags[1];
  const validTags = commitAndTags[2]
    .split(', ')
    .map(tag => tag.match(/^tag: (.+)/))
    .map(m => m?.[1])
    .map(t => semver.valid(t))
    .filter(v => !!v) as string[];

  const tagDetails = validTags.map(semverTag => {
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

  return { commit, tags: tagDetails };
}
