import { EvergreenApi } from '../evergreen';
import { confirm, spawnSync as spawnSyncFn } from '../helpers';
import { getLatestDraftOrReleaseTagFromLog } from './get-latest-tag';
import { getRepositoryStatus } from './repository-status';

export async function triggerReleasePublish(
  repositoryRoot: string,
  spawnSync: typeof spawnSyncFn = spawnSyncFn
): Promise<void> {
  console.info('Triggering process to publish a new release...');

  const gitStatus = getRepositoryStatus(repositoryRoot);
  if (gitStatus.branch?.local !== 'master') {
    throw new Error('You must be on the master branch of the repository to trigger a release.');
  }
  if (gitStatus.hasUnpushedTags) {
    throw new Error('You have local tags that are not pushed to the remote. Remove or push those tags to continue.');
  }

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

async function verifyEvergreenStatus(
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
