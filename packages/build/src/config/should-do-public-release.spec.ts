import { expect } from 'chai';
import { Config } from './config';
import { shouldDoPublicRelease } from './should-do-public-release';

describe('shouldDoPublicRelease', () => {
  it('returns false when isPatch is true', () => {
    const config: Partial<Config> = { isPatch: true };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });


  it('returns false when branch is not main', () => {
    const config: Partial<Config> = { branch: 'feature' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns false when branch is main but not tagged', () => {
    const config: Partial<Config> = { branch: 'main' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns false when current version does not match draft commit tag', () => {
    const config: Partial<Config> = { branch: 'main', triggeringGitTag: 'v0.0.4-draft.0', version: '0.0.4' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns false when current version does not match release commit tag', () => {
    const config: Partial<Config> = { branch: 'main', triggeringGitTag: 'v0.0.5', version: '0.0.4' };
    expect(shouldDoPublicRelease(config as any)).to.be.false;
  });

  it('returns true when version matches commit tag', () => {
    const config: Partial<Config> = { branch: 'main', triggeringGitTag: 'v0.0.3', version: '0.0.3' };
    expect(shouldDoPublicRelease(config as any)).to.be.true;
  });
});
