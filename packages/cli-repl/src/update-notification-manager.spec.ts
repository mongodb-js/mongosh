import { expect } from 'chai';
import { once } from 'events';
import { promises as fs } from 'fs';
import type { Server as HTTPServer, RequestListener } from 'http';
import { createServer as createHTTPServer } from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { UpdateNotificationManager } from './update-notification-manager';
import type { MongoshVersionsContents } from './update-notification-manager';
import { createFetch } from '@mongodb-js/devtools-proxy-support';
import type { BuildInfo } from './build-info';
import sinon from 'sinon';

const buildInfoFixture = (overrides: Partial<BuildInfo> = {}): BuildInfo => ({
  version: '1.0.0',
  nodeVersion: 'v22.3.0',
  distributionKind: 'packaged',
  installationMethod: 'other',
  runtimeArch: 'arm64',
  runtimePlatform: 'darwin',
  buildArch: 'arm64',
  buildPlatform: 'darwin',
  buildTarget: 'darwin-arm64',
  buildTime: null,
  gitVersion: null,
  opensslVersion: '3.0.0',
  sharedOpenssl: false,
  runtimeGlibcVersion: 'N/A',
  deps: {} as BuildInfo['deps'],
  ...overrides,
});

describe('UpdateNotificationManager', function () {
  let httpServer: HTTPServer;
  let httpServerUrl: string;
  let tmpdir: string;
  let filename: string;
  let reqHandler: sinon.SinonStub<Parameters<RequestListener>, void>;
  const fetch = createFetch({});

  beforeEach(async function () {
    reqHandler = sinon.stub<Parameters<RequestListener>, void>();
    reqHandler.callsFake((req, res) => {
      res.end('{}');
    });
    httpServer = createHTTPServer(reqHandler);
    httpServer.listen(0);
    await once(httpServer, 'listening');
    httpServerUrl = `http://127.0.0.1:${
      (httpServer.address() as AddressInfo).port
    }`;
    tmpdir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'mongosh-update-notification-manager')
    );
    filename = path.join(tmpdir, 'test.json');
  });

  afterEach(async function () {
    httpServer.close();
    await once(httpServer, 'close');
    await fs.rm(tmpdir, { recursive: true, force: true });
  });

  it('fetches and stores information about the current release', async function () {
    const manager = new UpdateNotificationManager({ fetch });
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    expect(await manager.getLatestVersionIfMoreRecent('')).to.equal(null);
    expect(reqHandler).to.have.been.calledOnce;
    const fileContents = JSON.parse(await fs.readFile(filename, 'utf-8'));
    expect(Object.keys(fileContents)).to.deep.equal([
      'updateURL',
      'lastChecked',
      'cta',
    ]);
    expect(fileContents.lastChecked).to.be.a('number');
  });

  it('uses existing data if some has been fetched recently', async function () {
    const manager = new UpdateNotificationManager({ fetch });
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    expect(reqHandler).to.have.been.calledOnce;
  });

  it('does not re-use existing data if the updateURL value has changed', async function () {
    const manager = new UpdateNotificationManager({ fetch });
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    await manager.fetchUpdateMetadata(
      httpServerUrl + '/?foo=bar',
      filename,
      '1.2.3'
    );
    expect(reqHandler).to.have.been.calledTwice;
  });

  it('caches 304 responses if the server supports ETag-based caching', async function () {
    let cacheHits = 0;
    reqHandler.callsFake((req, res) => {
      const etag = '"asdfghjkl"';
      if (req.headers['if-none-match'] === etag) {
        cacheHits++;
        res.writeHead(304);
        res.end();
        return;
      }
      res.setHeader('ETag', etag);
      res.end('{}');
    });
    const manager = new UpdateNotificationManager({ fetch });
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    await fs.writeFile(
      filename,
      JSON.stringify({
        ...JSON.parse(await fs.readFile(filename, 'utf8')),
        lastChecked: 0,
      })
    );
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    expect(reqHandler).to.have.been.calledTwice;
    expect(cacheHits).to.equal(1);
  });

  it('figures out the latest version in the received JSON file', async function () {
    reqHandler.callsFake((req, res) => {
      res.end(
        JSON.stringify({
          versions: [
            { version: '1.0.0' },
            { version: '1.1.0' },
            { version: '2.0.0-alpha.0' },
          ],
        })
      );
    });
    const manager = new UpdateNotificationManager({ fetch });
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    expect(await manager.getLatestVersionIfMoreRecent('')).to.equal('1.1.0');
    expect(await manager.getLatestVersionIfMoreRecent('1.0.0')).to.equal(
      '1.1.0'
    );
    expect(await manager.getLatestVersionIfMoreRecent('1.2.0')).to.equal(null);
    expect(await manager.getLatestVersionIfMoreRecent('2.0.0')).to.equal(null);
    expect(
      await manager.getLatestVersionIfMoreRecent('1.0.0-alpha.0')
    ).to.equal(null);
  });

  it('figures out the greeting CTA when set on a global level', async function () {
    const response: MongoshVersionsContents = {
      versions: [
        { version: '1.0.0' },
        {
          version: '1.1.0',
          cta: { chunks: [{ text: "Don't use 1.1.0, downgrade!!" }] },
        },
      ],
      cta: {
        chunks: [{ text: 'Vote for your favorite feature!', style: 'bold' }],
      },
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager({ fetch });
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    const cta = await manager.getGreetingCTAForCurrentVersion();
    expect(cta).to.not.be.undefined;
    expect(cta?.length).to.equal(1);
    expect(cta![0]?.text).to.equal('Vote for your favorite feature!');
    expect(cta![0]?.style).to.equal('bold');
  });

  it('figures out the greeting CTA when set on a per-version basis', async function () {
    const response: MongoshVersionsContents = {
      versions: [
        {
          version: '1.0.0',
          cta: {
            chunks: [
              { text: "Don't use 1.0.0, upgrade!! " },
              {
                text: 'https://downloads.mongodb.com/mongosh/1.1.0/',
                style: 'mongosh:uri',
              },
            ],
          },
        },
        {
          version: '1.1.0',
          cta: { chunks: [{ text: 'This version is very safe!' }] },
        },
      ],
      cta: {
        chunks: [{ text: 'Vote for your favorite feature!', style: 'bold' }],
      },
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager({ fetch });
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    const cta = await manager.getGreetingCTAForCurrentVersion();
    expect(cta).to.not.be.undefined;
    expect(cta?.length).to.equal(2);
    expect(cta![0]?.text).to.equal("Don't use 1.0.0, upgrade!! ");
    expect(cta![0]?.style).to.be.undefined;
    expect(cta![1]?.text).to.equal(
      'https://downloads.mongodb.com/mongosh/1.1.0/'
    );
    expect(cta![1]?.style).to.equal('mongosh:uri');
  });

  it('returns the CTA when match passes against buildInfo', async function () {
    const response: MongoshVersionsContents = {
      cta: {
        match: '^installationMethod=homebrew$',
        chunks: [{ text: 'Run `brew upgrade mongosh`' }],
      },
      versions: [],
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    const cta = await manager.getGreetingCTAForCurrentVersion(
      buildInfoFixture({ installationMethod: 'homebrew' })
    );
    expect(cta?.[0]?.text).to.equal('Run `brew upgrade mongosh`');
  });

  it('filters out the CTA when match fails against buildInfo', async function () {
    const response: MongoshVersionsContents = {
      cta: {
        match: '^installationMethod=homebrew$',
        chunks: [{ text: 'Run `brew upgrade mongosh`' }],
      },
      versions: [],
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    const cta = await manager.getGreetingCTAForCurrentVersion(
      buildInfoFixture({ installationMethod: 'npx' })
    );
    expect(cta).to.be.undefined;
  });

  it('supports alternation in the match regex', async function () {
    const response: MongoshVersionsContents = {
      cta: {
        match: '^nodeVersion=v22\\.(3|4)\\.0$',
        chunks: [{ text: 'Heads-up: Node REPL autocomplete bug' }],
      },
      versions: [],
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    expect(
      await manager.getGreetingCTAForCurrentVersion(
        buildInfoFixture({ nodeVersion: 'v22.4.0' })
      )
    ).to.not.be.undefined;
    expect(
      await manager.getGreetingCTAForCurrentVersion(
        buildInfoFixture({ nodeVersion: 'v22.5.0' })
      )
    ).to.be.undefined;
  });

  it('combines multiple constraints via lookahead', async function () {
    const response: MongoshVersionsContents = {
      cta: {
        match:
          '(?=[\\s\\S]*^installationMethod=homebrew$)(?=[\\s\\S]*^runtimePlatform=darwin$)',
        chunks: [{ text: 'macOS homebrew users' }],
      },
      versions: [],
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    expect(
      await manager.getGreetingCTAForCurrentVersion(
        buildInfoFixture({
          installationMethod: 'homebrew',
          runtimePlatform: 'darwin',
        })
      )
    ).to.not.be.undefined;
    expect(
      await manager.getGreetingCTAForCurrentVersion(
        buildInfoFixture({
          installationMethod: 'homebrew',
          runtimePlatform: 'linux',
        })
      )
    ).to.be.undefined;
  });

  it('matches against a boolean field', async function () {
    const response: MongoshVersionsContents = {
      cta: {
        match: '^sharedOpenssl=true$',
        chunks: [{ text: 'Linked against system OpenSSL' }],
      },
      versions: [],
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    expect(
      await manager.getGreetingCTAForCurrentVersion(
        buildInfoFixture({ sharedOpenssl: true })
      )
    ).to.not.be.undefined;
    expect(
      await manager.getGreetingCTAForCurrentVersion(
        buildInfoFixture({ sharedOpenssl: false })
      )
    ).to.be.undefined;
  });

  it('hides a match-gated CTA when buildInfo is not provided', async function () {
    const response: MongoshVersionsContents = {
      cta: {
        match: '^installationMethod=homebrew$',
        chunks: [{ text: 'Run `brew upgrade mongosh`' }],
      },
      versions: [],
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    expect(await manager.getGreetingCTAForCurrentVersion()).to.be.undefined;
  });

  it('returns a CTA without match when buildInfo is not provided', async function () {
    const response: MongoshVersionsContents = {
      cta: { chunks: [{ text: 'Vote for your favorite feature!' }] },
      versions: [],
    };
    reqHandler.callsFake((req, res) => {
      res.end(JSON.stringify(response));
    });

    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.0.0');

    const cta = await manager.getGreetingCTAForCurrentVersion();
    expect(cta?.[0]?.text).to.equal('Vote for your favorite feature!');
  });
});
