// Dispatches the publish-npm GitHub Actions workflow for the released version
// and waits for it to complete, so the evergreen task reflects the outcome of
// the npm publish as well. Run from the evergreen release_publish task.
//
// Uses the workspace's @octokit/rest (the same client the rest of the release
// tooling uses) via createRequire, since this runs outside the ts-node
// context. The nonce input identifies our run unambiguously: the workflow's
// run-name includes it, so we match on that instead of timestamps.
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const { Octokit } = require('@octokit/rest');

const OWNER = 'mongodb-js';
const REPO = 'mongosh';
const WORKFLOW_FILE = 'publish-npm.yml';
const token = process.env.GITHUB_TOKEN;
if (!token) {
  throw new Error('Usage: GITHUB_TOKEN=<token> dispatch-npm-publish.mjs');
}

const octokit = new Octokit({ auth: token });
const nonce = randomBytes(8).toString('hex');
const expectedRunName = `Publish npm packages (nonce = ${nonce})`;
const isDryRun = process.env.NPM_PUBLISH_DRY_RUN === 'true';

// Dispatch with a ref of main so GitHub can find the workflow file; with no
// tag input, the workflow publishes the latest mongosh@ tag. On dry-run
// dispatches (evergreen's dry-run task) that is the previous release, so the
// dry run validates the build/publish machinery, not the new versions.
await octokit.rest.actions.createWorkflowDispatch({
  owner: OWNER,
  repo: REPO,
  workflow_id: WORKFLOW_FILE,
  ref: 'main',
  inputs: isDryRun ? { nonce, 'dry-run': true } : { nonce },
});
console.info(
  `mongosh: dispatched ${WORKFLOW_FILE} (nonce = ${nonce}), waiting for it to complete...`
);

// Finds the run we just dispatched, it may take a moment to be created.
async function getDispatchedWorkflow({ octokit, expectedRunName, searchTimeoutMs, pollDelayMs = 30_000 }) {
  for (const start = Date.now(); Date.now() - start < searchTimeoutMs; ) {
    const {
      data: { workflow_runs: runs = [] },
    } = await octokit.rest.actions.listWorkflowRuns({
      owner: OWNER,
      repo: REPO,
      workflow_id: WORKFLOW_FILE,
      event: 'workflow_dispatch',
      per_page: 10,
    });
    const run = runs.find((r) => r.name === expectedRunName);
    if (run) return run;
    await sleep(pollDelayMs);
  }
}

// Polls the run until it completes and returns its conclusion. Cancels the
// run when the watch timeout expires.
async function pollToCompletion({
  octokit,
  runId,
  watchTimeoutMs,
  watchPollDelayMs = 30_000,
}) {
  for (const start = Date.now(); Date.now() - start < watchTimeoutMs; ) {
    const {
      data: { status, conclusion },
    } = await octokit.rest.actions.getWorkflowRun({
      owner: OWNER,
      repo: REPO,
      run_id: runId,
    });
    console.info(`Run status: ${status}`);
    if (status === 'completed') {
      if (conclusion !== 'success') {
        throw new Error(`npm publish workflow failed: ${conclusion}`);
      }
      return conclusion;
    }
    await sleep(watchPollDelayMs);
  }
  // Don't leave the run going after we've given up on it.
  await octokit.rest.actions.cancelWorkflowRun({
    owner: OWNER,
    repo: REPO,
    run_id: runId,
  });
  throw new Error('Timed out waiting for the npm publish run');
}

const deadline = Date.now() + 2 * 60 * 60 * 1000; // the run takes ~30min; 2h for queue delays
const run = await getDispatchedWorkflow({
  octokit,
  expectedRunName,
  searchTimeoutMs: deadline - Date.now(),
});
if (!run) {
  throw new Error('Timed out waiting for the npm publish run to appear');
}
console.info(`mongosh: run found: ${run.html_url}`);

const conclusion = await pollToCompletion({
  octokit,
  runId: run.id,
  watchTimeoutMs: 2 * 60 * 60 * 1000, // the run takes ~30min; 2h for queue delays
});
console.info(`mongosh: npm publish succeeded (${conclusion}): ${run.html_url}`);
process.exit(0);
