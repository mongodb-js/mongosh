// Dispatches the publish-npm GitHub Actions workflow for the released version
// and waits for it to complete, so the evergreen task reflects the outcome of
// the npm publish as well. Run from the evergreen release_publish task.
import { setTimeout as sleep } from 'timers/promises';

const [repo, workflow] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN;
if (!token || !repo || !workflow) {
  throw new Error(
    'Usage: GITHUB_TOKEN=<token> dispatch-npm-publish.mjs <owner/repo> <workflow-file>'
  );
}

const headers = {
  authorization: `Bearer ${token}`,
};

const api = (path, init) =>
  fetch(`https://api.github.com/repos/${repo}${path}`, { headers, ...init });

// Dispatch with a ref of main so GitHub can find the workflow file; with no
// tag input, the workflow publishes the latest mongosh@ tag, which is the
// one this release just pushed.
const startedBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const res = await api(`/actions/workflows/${workflow}/dispatches`, {
  method: 'POST',
  body: JSON.stringify({ ref: 'main' }),
});
if (res.status !== 204) {
  throw new Error(`Dispatch failed: ${res.status} - ${await res.text()}`);
}
console.info(`mongosh: dispatched ${workflow}, waiting for it to complete...`);

// GitHub needs a moment to create the run after the dispatch.
await sleep(30_000);
const deadline = Date.now() + 2 * 60 * 60 * 1000;
while (true) {
  if (Date.now() > deadline) {
    throw new Error(`Timed out waiting for the ${workflow} run`);
  }
  const { workflow_runs: runs = [] } = await (
    await api(
      `/actions/workflows/${workflow}/runs?event=workflow_dispatch&per_page=10`
    )
  ).json();
  const run = runs.find(
    (r) => r.head_branch === 'main' && r.created_at >= startedBefore
  );
  if (run?.status === 'completed') {
    if (run.conclusion !== 'success') {
      throw new Error(`npm publish workflow failed: ${run.html_url}`);
    }
    console.info(`mongosh: npm publish succeeded: ${run.html_url}`);
    process.exit(0);
  }
  await sleep(30_000);
}
