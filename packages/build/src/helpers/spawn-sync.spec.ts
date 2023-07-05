import { expect } from 'chai';
import { spawnSync } from './spawn-sync';

describe('npm-packages spawnSync', function () {
  it('works for a valid command', function () {
    const result = spawnSync('bash', ['-c', 'echo -n works'], {
      encoding: 'utf8',
    });
    expect(result.status).to.equal(0);
    expect(result.stdout).to.equal('works');
  });

  it('throws on ENOENT error', function () {
    try {
      spawnSync('notaprogram', [], { encoding: 'utf8' });
    } catch (e: any) {
      return expect(e).to.not.be.undefined;
    }
    expect.fail('Expected error');
  });

  it('throws on non-zero exit code', function () {
    try {
      spawnSync('bash', ['-c', 'exit 1'], { encoding: 'utf8' });
    } catch (e: any) {
      return expect(e).to.not.be.undefined;
    }
    expect.fail('Expected error');
  });

  it('ignores errors when asked to for ENOENT', function () {
    const result = spawnSync('notaprogram', [], { encoding: 'utf8' }, true);
    expect(result).to.not.be.undefined;
  });

  it('ignores errors when asked to for non-zero exit code', function () {
    const result = spawnSync(
      'bash',
      ['-c', 'exit 1'],
      { encoding: 'utf8' },
      true
    );
    expect(result).to.not.be.undefined;
    expect(result?.status).to.equal(1);
  });
});
