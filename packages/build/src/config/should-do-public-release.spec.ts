import { expect } from 'chai';
import { Config } from './config';
import { shouldDoPublicRelease } from './should-do-public-release';

describe('shouldDoPublicRelease', () => {
  it('returns false when isPatch is true', async() => {
    const config: Partial<Config> = { isPatch: true };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });


  it('returns false when branch is not master', async() => {
    const config: Partial<Config> = { branch: 'feature' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns false when branch is master but not tagged', async() => {
    const config: Partial<Config> = { branch: 'master' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns false when current version does not match draft commit tag', async() => {
    const config: Partial<Config> = { branch: 'master', triggeringGitTag: 'v0.0.4-draft.0', version: '0.0.4' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns false when current version does not match release commit tag', async() => {
    const config: Partial<Config> = { branch: 'master', triggeringGitTag: 'v0.0.5', version: '0.0.4' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns true when version matches commit tag', async() => {
    const config: Partial<Config> = { branch: 'master', triggeringGitTag: 'v0.0.3', version: '0.0.3' };
    expect(shouldDoPublicRelease(config as any)).to.be.true;
  });
});
