import assert from 'assert';
import semver from 'semver';
import { choose, confirm, spawnSync as spawnSyncFn } from '../helpers';
import { getLatestDraftOrReleaseTagFromLog, TagDetails } from './get-latest-tag';
import { getRepositoryStatus } from './repository-status';

type BumpType = 'draft' | 'patch' | 'minor' | 'major';

export async function triggerReleaseDraft(
  repositoryRoot: string,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  console.info('Triggering process to create a new release draft...');

  verifyGitStatus(repositoryRoot);

  const latestDraftOrReleaseTag = getLatestDraftOrReleaseTagFromLog(repositoryRoot);
  if (!latestDraftOrReleaseTag) {
    throw new Error('Could not find a previous draft or release tag.');
  }
  console.info(`-> Most recent tag: v${latestDraftOrReleaseTag.tag.semverName} on commit ${latestDraftOrReleaseTag.commit}`);

  let bumpType: BumpType = 'draft';
  if (latestDraftOrReleaseTag.tag.draftVersion === undefined) {
    bumpType = await choose('>  Select the type of increment for the new version', [
      'patch', 'minor', 'major'
    ], '... enter your choice:') as BumpType;
  }

  const nextTagName = computeNextTagName(latestDraftOrReleaseTag.tag, bumpType);
  console.info('-> New draft tag is:');
  console.info(`       ${nextTagName}`);

  const confirmed = await confirm('!! Is this correct and should the draft process continue?');
  if (!confirmed) {
    throw new Error('User aborted.');
  }

  console.info('... creating and pushing tag ...');
  spawnSync('git', ['tag', nextTagName], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });
  spawnSync('git', ['push', '--tags'], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });

  console.info('SUCCESS! Your new draft has been tagged and pushed.');
}

function verifyGitStatus(repositoryRoot: string): void {
  const repositoryStatus = getRepositoryStatus(repositoryRoot);
  if (!repositoryStatus.branch?.local) {
    throw new Error('Could not determine local repository information - please verify your repository is intact.');
  }

  if (repositoryStatus.branch?.local !== 'master') {
    throw new Error('Triggering a draft release is only allowed from master branch');
  }
  if (!repositoryStatus.branch.tracking) {
    throw new Error('The branch you are on is not tracking any remote branch. Ensure you are on the master branch of the repository.');
  }
  if (repositoryStatus.branch?.diverged || !repositoryStatus.clean) {
    throw new Error('Your local repository is not clean or divereged from the remote branch. Commit any uncommited changes and ensure your branch is up to date.');
  }
  if (repositoryStatus.hasUnpushedTags) {
    throw new Error('You have local tags that are not pushed to the remote. Remove or push those tags to continue.');
  }
}

function computeNextTagName(latestDraftOrReleaseTag: TagDetails, bumpType: BumpType): string {
  if (latestDraftOrReleaseTag.draftVersion !== undefined) {
    assert(bumpType === 'draft');
    return `v${latestDraftOrReleaseTag.releaseVersion}-draft.${latestDraftOrReleaseTag.draftVersion + 1}`;
  }
  assert(bumpType !== 'draft');

  let major = semver.major(latestDraftOrReleaseTag.releaseVersion);
  let minor = semver.minor(latestDraftOrReleaseTag.releaseVersion);
  let patch = semver.patch(latestDraftOrReleaseTag.releaseVersion);

  switch (bumpType) {
    case 'patch':
      patch += 1;
      break;
    case 'minor':
      minor += 1;
      break;
    case 'major':
      major += 1;
      break;
    default:
      throw new Error(`unexpected bump type ${bumpType}`);
  }

  return `v${major}.${minor}.${patch}-draft.0`;
}
