import { expect } from 'chai';
import { getReleaseVersionFromTag } from './get-release-version-from-tag';

describe('GithubRepo', function () {
  describe('getReleaseVersionFromTag', function () {
    it('returns undefined when the tagName is empty or undefined', function () {
      expect(getReleaseVersionFromTag('')).to.be.undefined;
      expect(getReleaseVersionFromTag(undefined)).to.be.undefined;
    });

    it('returns undefined if the tag is not a semver', function () {
      expect(getReleaseVersionFromTag('123')).to.be.undefined;
      expect(getReleaseVersionFromTag('xyz')).to.be.undefined;
    });

    it('returns undefined if the tag is a prerelease but not rc', function () {
      expect(getReleaseVersionFromTag('1.2.3-beta.4')).to.be.undefined;
    });

    it('returns the version string if the tag is a GA', function () {
      expect(getReleaseVersionFromTag('1.2.3')).to.equal('1.2.3');
      expect(getReleaseVersionFromTag('v1.2.3')).to.equal('1.2.3');
    });

    it('returns the version string if the tag is a draft prerelease', function () {
      expect(getReleaseVersionFromTag('1.2.3-draft.0')).to.equal('1.2.3');
      expect(getReleaseVersionFromTag('v1.2.3-draft.0')).to.equal('1.2.3');
    });
  });
});
