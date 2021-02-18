import { EvergreenApi } from '../evergreen';
import { confirm as confirmFn, spawnSync as spawnSyncFn } from '../helpers';
import { getLatestDraftOrReleaseTagFromLog as getLatestDraftOrReleaseTagFromLogFn } from './get-latest-tag';
import { verifyGitStatus as verifyGitStatusFn } from './repository-status';

export async function triggerReleasePublish(
  repositoryRoot: string,
  verifyGitStatus: typeof verifyGitStatusFn = verifyGitStatusFn,
  getLatestDraftOrReleaseTagFromLog: typeof getLatestDraftOrReleaseTagFromLogFn = getLatestDraftOrReleaseTagFromLogFn,
  confirm: typeof confirmFn = confirmFn,
  verifyEvergreenStatus: typeof verifyEvergreenStatusFn = verifyEvergreenStatusFn,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  console.info('Triggering process to publish a new release...');

  verifyGitStatus(repositoryRoot);

  const latestDraftTag = getLatestDraftOrReleaseTagFromLog(repositoryRoot);
  if (!latestDraftTag) {
    throw new Error('Failed to find a prior tag to release from.');
  }
  if (latestDraftTag.tag.draftVersion === undefined) {
    throw new Error(`Found prior tag v${latestDraftTag.tag.semverName} - but it's not a draft.`);
  }

  console.info('-> Found most recent draft tag:');
  console.info(`      version: v${latestDraftTag.tag.semverName}`);
  console.info(`       commit: ${latestDraftTag.commit}`);
  console.info(`      release: v${latestDraftTag.tag.releaseVersion}`);
  const confirmed = await confirm(`!! Is this correct and should we tag ${latestDraftTag.commit} as v${latestDraftTag.tag.releaseVersion}?`);
  if (!confirmed) {
    throw new Error('User aborted.');
  }

  console.info('... verifying evergreen status ...');
  await verifyEvergreenStatus(latestDraftTag.commit);

  console.info('... tagging commit and pushing ...');
  spawnSync('git', ['tag', `v${latestDraftTag.tag.releaseVersion}`, latestDraftTag.commit], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });
  spawnSync('git', ['push', '--tags'], {
    cwd: repositoryRoot,
    encoding: 'utf-8'
  });

  console.info('SUCCESS! Your new release has been tagged and published.');
}

export async function verifyEvergreenStatusFn(
  commitSha: string,
  evergreenApiProvider: Promise<EvergreenApi> = EvergreenApi.fromUserConfiguration()
): Promise<void> {
  const evergreenApi = await evergreenApiProvider;
  const tasks = await evergreenApi.getTasks('mongosh', commitSha);
  const unsuccessfulTasks = tasks.filter(t => t.status !== 'success');

  if (unsuccessfulTasks.length) {
    console.error('!! Detected the following failed tasks on Evergreen:');
    unsuccessfulTasks.forEach(t => {
      console.error(`   > ${t.display_name} on ${t.build_variant}`);
    });
    console.error('!! Please trigger a new draft and ensure all tasks complete successfully.');
    throw new Error('Some Evergreen tasks were not successful.');
  }
}
