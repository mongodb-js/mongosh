import { EvergreenApi } from '../evergreen';
import type { TaggedCommit } from '../git';
import {
  getLatestDraftOrReleaseTagFromLog as getLatestDraftOrReleaseTagFromLogFn,
  getReleaseVersionRestrictionFromBranch,
  verifyGitStatus as verifyGitStatusFn,
} from '../git';
import { confirm as confirmFn, spawnSync as spawnSyncFn } from '../helpers';

const DEFAULT_EVERGREEN_PROJECT = 'mongosh';

/**
 * The Evergreen project a release is built in. Every release line runs in its
 * own project (main in `mongosh`, the 2.x line in `mongosh-2.x`, ...) because
 * an Evergreen project tracks a single branch.
 */
export function getEvergreenProjectForBranch(
  branchName: string | undefined
): string {
  const major = getReleaseVersionRestrictionFromBranch(branchName)?.major;
  return major === undefined
    ? DEFAULT_EVERGREEN_PROJECT
    : `${DEFAULT_EVERGREEN_PROJECT}-${major}.x`;
}

export async function triggerReleasePublish(
  repositoryRoot: string,
  verifyGitStatus: typeof verifyGitStatusFn = verifyGitStatusFn,
  getLatestDraftOrReleaseTagFromLog: typeof getLatestDraftOrReleaseTagFromLogFn = getLatestDraftOrReleaseTagFromLogFn,
  confirm: typeof confirmFn = confirmFn,
  verifyEvergreenStatus: typeof verifyEvergreenStatusFn = verifyEvergreenStatusFn,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  console.info('Triggering process to publish a new release...');

  const repositoryStatus = verifyGitStatus(repositoryRoot);
  const sourceBranch = repositoryStatus.branch?.local;
  const versionRestriction =
    getReleaseVersionRestrictionFromBranch(sourceBranch);
  const evergreenProject = getEvergreenProjectForBranch(sourceBranch);

  const latestDraftTag = getLatestDraftOrReleaseTagFromLog(
    repositoryRoot,
    versionRestriction
  );
  if (!latestDraftTag) {
    throw new Error('Failed to find a prior tag to release from.');
  }
  if (latestDraftTag.tag.draftVersion === undefined) {
    throw new Error(
      `Found prior tag v${latestDraftTag.tag.semverName} - but it's not a draft.`
    );
  }
  const releaseTag = `v${latestDraftTag.tag.releaseVersion}`;

  console.info('-> Found most recent draft tag:');
  console.info(`      version: v${latestDraftTag.tag.semverName}`);
  console.info(`       commit: ${latestDraftTag.commit}`);
  console.info(`      release: ${releaseTag}`);
  console.info(`       branch: ${sourceBranch ?? 'unknown'}`);
  console.info(`      project: ${evergreenProject}`);
  const confirmed = await confirm(
    `!! Is this correct and should we tag ${latestDraftTag.commit} as ${releaseTag}?`
  );
  if (!confirmed) {
    throw new Error('User aborted.');
  }

  console.info('... verifying evergreen status ...');
  await verifyEvergreenStatus(latestDraftTag, evergreenProject);

  // The branch is recorded on the tag because the publish step is what merges
  // the version bump back, and it only runs in CI, where the release branch is
  // no longer known (the tag commit is not on any branch yet).
  const tagMessage = sourceBranch
    ? `${releaseTag} from ${sourceBranch}`
    : releaseTag;

  console.info('... tagging commit and pushing ...');
  spawnSync(
    'git',
    ['tag', '-m', tagMessage, releaseTag, latestDraftTag.commit],
    {
      cwd: repositoryRoot,
      encoding: 'utf-8',
      stdio: 'inherit',
    }
  );
  spawnSync('git', ['push', 'origin', releaseTag], {
    cwd: repositoryRoot,
    encoding: 'utf-8',
    stdio: 'inherit',
  });

  console.info('SUCCESS! Your new release has been tagged and published.');
}

export async function verifyEvergreenStatusFn(
  latestDraftTag: TaggedCommit,
  project: string,
  evergreenApiProvider: Promise<EvergreenApi> = EvergreenApi.fromUserConfiguration(),
  confirm: typeof confirmFn = confirmFn
): Promise<void> {
  const evergreenApi = await evergreenApiProvider;
  const tasks = await evergreenApi.getTasks(
    project,
    latestDraftTag.commit,
    `v${latestDraftTag.tag.semverName}`
  );
  const unsuccessfulTasks = tasks.filter((t) => t.status !== 'success');

  if (!unsuccessfulTasks.length) {
    return;
  }

  console.error('!! Detected the following not successful tasks on Evergreen:');
  unsuccessfulTasks.forEach((t) => {
    console.error(`   > ${t.display_name} on ${t.build_variant}`);
  });

  const stillContinue = await confirm(
    '!! Do you want to continue and still release despite non-successful tasks?'
  );
  if (!stillContinue) {
    console.error(
      '!! Please trigger a new draft and ensure all tasks complete successfully.'
    );
    throw new Error('Some Evergreen tasks were not successful.');
  }
}
