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
import sinon from 'sinon';

describe('UpdateNotificationManager', function () {
  let httpServer: HTTPServer;
  let httpServerUrl: string;
  let tmpdir: string;
  let filename: string;
  let reqHandler: sinon.SinonStub<Parameters<RequestListener>, void>;

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
    const manager = new UpdateNotificationManager();
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
    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    await manager.fetchUpdateMetadata(httpServerUrl, filename, '1.2.3');
    expect(reqHandler).to.have.been.calledOnce;
  });

  it('does not re-use existing data if the updateURL value has changed', async function () {
    const manager = new UpdateNotificationManager();
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
    const manager = new UpdateNotificationManager();
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
    const manager = new UpdateNotificationManager();
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

    const manager = new UpdateNotificationManager();
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

    const manager = new UpdateNotificationManager();
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
});
