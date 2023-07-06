import semver from 'semver';

export function getReleaseVersionFromTag(tagName?: string): string | undefined {
  if (!tagName) {
    return;
  }

  const tagSemver = semver.valid(tagName);

  if (!tagSemver) {
    return;
  }

  // we only consider a tag to be eligible as a release version if the tag is
  // a GA (vX.X.X) or rc (vX.X.X-rc.X) version.
  const prerelease = semver.prerelease(tagSemver);

  if (prerelease && prerelease[0] !== 'draft') {
    return;
  }

  return `${semver.major(tagSemver)}.${semver.minor(tagSemver)}.${semver.patch(
    tagSemver
  )}`;
}
