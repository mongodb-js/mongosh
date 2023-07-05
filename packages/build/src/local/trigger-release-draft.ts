import assert from 'assert';
import semver from 'semver';
import type { TagDetails } from '../git';
import {
  getLatestDraftOrReleaseTagFromLog as getLatestDraftOrReleaseTagFromLogFn,
  getReleaseVersionFromBranch,
  verifyGitStatus as verifyGitStatusFn,
} from '../git';
import {
  choose as chooseFn,
  confirm as confirmFn,
  spawnSync as spawnSyncFn,
} from '../helpers';

type BumpType = 'draft' | 'patch' | 'minor' | 'major';

export async function triggerReleaseDraft(
  repositoryRoot: string,
  verifyGitStatus: typeof verifyGitStatusFn = verifyGitStatusFn,
  getLatestDraftOrReleaseTagFromLog: typeof getLatestDraftOrReleaseTagFromLogFn = getLatestDraftOrReleaseTagFromLogFn,
  choose: typeof chooseFn = chooseFn,
  confirm: typeof confirmFn = confirmFn,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  console.info('Triggering process to create a new release draft...');

  const repositoryStatus = verifyGitStatus(repositoryRoot);
  const branchReleaseVersion = getReleaseVersionFromBranch(
    repositoryStatus.branch?.local
  );

  const latestDraftOrReleaseTag = getLatestDraftOrReleaseTagFromLog(
    repositoryRoot,
    branchReleaseVersion
  );
  if (!latestDraftOrReleaseTag) {
    throw new Error('Could not find a previous draft or release tag.');
  }
  console.info(
    `-> Most recent tag: v${latestDraftOrReleaseTag.tag.semverName} on commit ${latestDraftOrReleaseTag.commit}`
  );

  let bumpType: BumpType | undefined = undefined;
  if (
    branchReleaseVersion &&
    latestDraftOrReleaseTag.tag.draftVersion === undefined
  ) {
    console.info(
      '-> You are on a release branch, last tag was a release - assuming patch...'
    );
    bumpType = 'patch';
  } else if (latestDraftOrReleaseTag.tag.draftVersion !== undefined) {
    console.info('-> Last tag was a draft - assuming another draft...');
    bumpType = 'draft';
  }

  let confirmInferred = false;
  if (bumpType) {
    confirmInferred = await confirm(
      `-> Is it okay to continue with tag type ${bumpType}?`,
      true
    );
  }

  if (!bumpType || !confirmInferred) {
    bumpType = (await choose(
      '>  Select the type of increment for the new version',
      ['patch', 'minor', 'major'],
      '... enter your choice:'
    )) as BumpType;
  }

  const nextTagName = computeNextTagNameFn(
    latestDraftOrReleaseTag.tag,
    bumpType
  );
  console.info('-> New draft tag is:');
  console.info(`       ${nextTagName}`);

  const confirmed = await confirm(
    '!! Is this correct and should the draft process continue?'
  );
  if (!confirmed) {
    throw new Error('User aborted.');
  }

  console.info('... creating and pushing tag ...');
  spawnSync('git', ['tag', nextTagName], {
    cwd: repositoryRoot,
    encoding: 'utf-8',
  });
  spawnSync('git', ['push', 'origin', nextTagName], {
    cwd: repositoryRoot,
    encoding: 'utf-8',
  });

  console.info('SUCCESS! Your new draft has been tagged and pushed.');
}

export function computeNextTagNameFn(
  latestDraftOrReleaseTag: TagDetails,
  bumpType: BumpType
): string {
  if (bumpType === 'draft') {
    assert(latestDraftOrReleaseTag.draftVersion !== undefined);
    return `v${latestDraftOrReleaseTag.releaseVersion}-draft.${
      latestDraftOrReleaseTag.draftVersion + 1
    }`;
  }

  let major = semver.major(latestDraftOrReleaseTag.releaseVersion);
  let minor = semver.minor(latestDraftOrReleaseTag.releaseVersion);
  let patch = semver.patch(latestDraftOrReleaseTag.releaseVersion);

  switch (bumpType) {
    case 'patch':
      patch += 1;
      break;
    case 'minor':
      patch = 0;
      minor += 1;
      break;
    case 'major':
      patch = 0;
      minor = 0;
      major += 1;
      break;
    default:
      throw new Error(`unexpected bump type ${bumpType}`);
  }

  return `v${major}.${minor}.${patch}-draft.0`;
}
