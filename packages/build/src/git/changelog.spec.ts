import { expect } from 'chai';
import sinon from 'sinon';
import { generateChangelog } from './changelog';

describe('git changelog', function () {
  let spawnSync: sinon.SinonStub;

  beforeEach(function () {
    spawnSync = sinon.stub();
  });

  it('generates a proper changelog', function () {
    spawnSync.returns({
      stdout: `
chore(build): generate release notes on draft MONGOSH-325
fix(node-runtime-worker-thread): Read worker source and eval instead of passing path to the worker constructor (#679)
chore(build): ensure to remove a GitHub asset before re-uploading (#678)
feat(shell-api): fix releasing to barque and evergreen checks COMPASS-4435 (#677)
chore(build): allow support releases MONGOSH-535 (#675)
fix(cli-repl): defer exit event until evalutation done (#669)
chore(build): simplify analytics config generation (#671)
chore(build): add local release command MONGOSH-530 (#667)
fix(build): update github release assets properly MONGOSH-606 (#672)
      `,
    });

    const changelog = generateChangelog('v0.8.0', spawnSync);
    expect(changelog).to.equal(`\
## Features

- **shell-api**: Fix releasing to barque and evergreen checks (COMPASS-4435, #677)


## Bug Fixes

- **node-runtime-worker-thread**: Read worker source and eval instead of passing path to the worker constructor (#679)
- **cli-repl**: Defer exit event until evalutation done (#669)
- **build**: Update github release assets properly (MONGOSH-606, #672)

`);
  });
});
