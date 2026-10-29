// Mock of the GitHub API endpoints used by dispatch-npm-publish.mjs.
// Loaded via `node --import` in the tests; patches globalThis.fetch so the
// script can run its full flow without network access or credentials.
const state = {
  dispatchBody: null,
  runStatusCalls: 0,
};

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });

  if (u.endsWith('/dispatches') && init.method === 'POST') {
    state.dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  }
  if (u.endsWith('/installation')) {
    return json({ id: 42 });
  }
  if (u.includes('/app/installations/42/access_tokens')) {
    return json({ token: 'mock-installation-token' });
  }
  if (u.includes('/actions/workflows/publish-npm.yml/runs?')) {
    return json({
      workflow_runs: [
        {
          id: 42,
          name: `Publish npm packages (nonce = ${
            state.dispatchBody?.inputs?.nonce ?? ''
          })`,
          html_url: 'https://github.com/mongodb-js/mongosh/actions/runs/42',
          status: 'completed',
          conclusion: 'success',
        },
      ],
    });
  }
  if (u.includes('/actions/runs/42')) {
    state.runStatusCalls++;
    return json(
      state.runStatusCalls === 1
        ? { status: 'in_progress', conclusion: null }
        : { status: 'completed', conclusion: 'success' }
    );
  }
  return json({ message: 'not mocked' }, 404);
};
