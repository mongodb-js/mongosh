import semver from 'semver';
import { promises as fs } from 'fs';
import type { RequestInfo, RequestInit, Response } from 'node-fetch';

// 'http' is not supported in startup snapshots yet.
const fetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> =>
  await (await import('node-fetch')).default(url, init);

interface MongoshUpdateLocalFileContents {
  lastChecked?: number;
  latestKnownMongoshVersion?: string;
  etag?: string;
  updateURL?: string;
}

// Utility for fetching metadata about potentially available newer versions
// and returning that latest version if available.
export class UpdateNotificationManager {
  private latestKnownMongoshVersion: string | undefined = undefined;
  private localFilesystemFetchInProgress: Promise<unknown> | undefined =
    undefined;

  async getLatestVersionIfMoreRecent(
    currentVersion: string
  ): Promise<string | null> {
    try {
      await this.localFilesystemFetchInProgress;
    } catch {
      /* already handled in fetchUpdateMetadata() */
    }
    if (!this.latestKnownMongoshVersion) return null;
    if (
      currentVersion &&
      !semver.gt(this.latestKnownMongoshVersion, currentVersion)
    )
      return null;
    if (currentVersion && semver.prerelease(currentVersion)) return null;
    return this.latestKnownMongoshVersion;
  }

  // Fetch update metadata, taking into account a local cache and an external
  // JSON feed. This function will throw in case it failed to load information
  // about latest versions.
  async fetchUpdateMetadata(
    updateURL: string,
    localFilePath: string
  ): Promise<void> {
    let localFileContents: MongoshUpdateLocalFileContents | undefined;
    await (this.localFilesystemFetchInProgress = (async () => {
      let localFileText = '';
      try {
        localFileText = await fs.readFile(localFilePath, 'utf-8');
      } catch (err: unknown) {
        // Do not fail if the error is just ENOENT
        if (
          !(
            err &&
            typeof err === 'object' &&
            'code' in err &&
            err.code === 'ENOENT'
          )
        )
          throw err;
      }

      try {
        localFileContents = JSON.parse(localFileText);
      } catch {
        // ignore possibly corrupted file contents
      }

      if (localFileContents?.updateURL !== updateURL) {
        // Invalidate local cache if the source URL has changed.
        localFileContents = undefined;
      }

      if (localFileContents?.latestKnownMongoshVersion) {
        this.latestKnownMongoshVersion =
          localFileContents.latestKnownMongoshVersion;
      }

      this.localFilesystemFetchInProgress = undefined;
    })());

    if (
      localFileContents?.lastChecked &&
      Date.now() - localFileContents.lastChecked < 86400_000
    ) {
      return;
    }

    const response = await fetch(updateURL, {
      headers: localFileContents?.etag
        ? { 'if-none-match': localFileContents?.etag }
        : {},
    });

    if (response.status === 304 /* Not Modified, i.e. ETag matched */) {
      response.body
        .on('error', () => {
          /* ignore response content and errors */
        })
        .resume();
      localFileContents = { ...localFileContents, lastChecked: Date.now() };
      await fs.writeFile(localFilePath, JSON.stringify(localFileContents));
      return;
    }

    if (!response.ok) {
      throw new Error(
        `Unexpected status code fetching ${updateURL}: ${response.status} ${response.statusText}`
      );
    }

    const jsonContents = await response.json();
    this.latestKnownMongoshVersion = (jsonContents?.versions as any[])
      ?.map((v: any) => v.version as string)
      ?.filter((v) => !semver.prerelease(v))
      ?.sort(semver.rcompare)?.[0];

    localFileContents = {
      updateURL,
      lastChecked: Date.now(),
      etag: response.headers.get('etag') ?? undefined,
      latestKnownMongoshVersion: this.latestKnownMongoshVersion,
    };
    await fs.writeFile(localFilePath, JSON.stringify(localFileContents));
  }
}
