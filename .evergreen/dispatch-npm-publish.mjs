// Dispatches the publish-npm GitHub Actions workflow for the released version
// and waits for it to complete, so the evergreen task reflects the outcome of
// the npm publish as well. Run from the evergreen release_publish task.
//
// Uses the workspace's @octokit via createRequire, since this runs outside the ts-node
// context. The nonce input identifies our run unambiguously: the workflow's
// run-name includes it.
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

const OWNER = 'mongodb-js';
const REPO = 'mongosh';
const WORKFLOW_FILE = 'publish-npm.yml';
const SEARCH_TIMEOUT_MS = 5 * 60 * 1000;
// the run takes ~30min; 2h for queue delays
const WATCH_TIMEOUT_MS = 2 * 60 * 60 * 1000;
// Overridable for tests so they don't have to wait out the real poll interval.
const POLL_DELAY_MS = Number(process.env.NPM_PUBLISH_POLL_DELAY_MS) || 30_000;
const appId = process.env.DEVTOOLS_BOT_APP_ID;
// The key may be stored single-line with literal \n escapes.
const privateKey = process.env.DEVTOOLS_BOT_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!appId || !privateKey) {
  throw new Error(
    'DEVTOOLS_BOT_APP_ID and DEVTOOLS_BOT_PRIVATE_KEY are required'
  );
}

// Two auth identities are needed: the installation lookup is an app-level
// route, which the auth-app hook authenticates with the app JWT
// automatically; everything else acts as the installation. Each identity gets
// its own client, as in the auth-app docs.
const appOctokit = new Octokit({
  authStrategy: createAppAuth,
  auth: { appId, privateKey },
});
const {
  data: { id: installationId },
} = await appOctokit.rest.apps.getRepoInstallation({
  owner: OWNER,
  repo: REPO,
});
// Creates the installation token on first use and refreshes it when it
// expires.
const octokit = new Octokit({
  authStrategy: createAppAuth,
  auth: { appId, privateKey, installationId },
});

const nonce = randomBytes(8).toString('hex');
const expectedRunName = `Publish npm packages (nonce = ${nonce})`;
const isDryRun = process.env.NPM_PUBLISH_DRY_RUN === 'true';

// The evergreen publish task bumps the workspace's mongosh package to the
// release version, so the exact release tag can be derived from it. Passing
// it explicitly matters for patch releases of older branches, where the
// latest mongosh@ tag is NOT this release.
const { version } = JSON.parse(
  await fs.readFile('packages/cli-repl/package.json', 'utf8')
);
const tag = `mongosh@${version}`;

// Dispatch with a ref of main so GitHub can find the workflow file. On
// dry-run dispatches (evergreen's dry-run task) the workflow checks out main
// and validates the build/publish machinery without publishing. The dry-run
// input is always sent explicitly — the workflow defaults it to true.
await octokit.rest.actions.createWorkflowDispatch({
  owner: OWNER,
  repo: REPO,
  workflow_id: WORKFLOW_FILE,
  ref: 'main',
  inputs: { tag, nonce, 'dry-run': isDryRun },
});
console.info(
  `mongosh: dispatched ${WORKFLOW_FILE} for ${tag} (nonce = ${nonce}), waiting for it to complete...`
);

// Finds the run we just dispatched, it may take a moment to be created.
async function getDispatchedWorkflow({
  expectedRunName,
  searchTimeoutMs,
  pollDelayMs = POLL_DELAY_MS,
}) {
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
  runId,
  watchTimeoutMs,
  watchPollDelayMs = POLL_DELAY_MS,
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

const run = await getDispatchedWorkflow({
  expectedRunName,
  searchTimeoutMs: SEARCH_TIMEOUT_MS,
});
if (!run) {
  throw new Error('Timed out waiting for the npm publish run to appear');
}
console.info(`mongosh: run found: ${run.html_url}`);

const conclusion = await pollToCompletion({
  runId: run.id,
  watchTimeoutMs: WATCH_TIMEOUT_MS,
});
console.info(`mongosh: npm publish succeeded (${conclusion}): ${run.html_url}`);
process.exit(0);
