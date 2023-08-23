import { expect } from 'chai';
import { once } from 'events';
import { promises as fs } from 'fs';
import type { Server as HTTPServer, RequestListener } from 'http';
import { createServer as createHTTPServer } from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { UpdateNotificationManager } from './update-notification-manager';
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
    await manager.fetchUpdateMetadata(httpServerUrl, filename);
    expect(await manager.getLatestVersionIfMoreRecent('')).to.equal(null);
    expect(reqHandler).to.have.been.calledOnce;
    const fileContents = JSON.parse(await fs.readFile(filename, 'utf-8'));
    expect(Object.keys(fileContents)).to.deep.equal([
      'updateURL',
      'lastChecked',
    ]);
    expect(fileContents.lastChecked).to.be.a('number');
  });

  it('uses existing data if some has been fetched recently', async function () {
    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename);
    await manager.fetchUpdateMetadata(httpServerUrl, filename);
    expect(reqHandler).to.have.been.calledOnce;
  });

  it('does not re-use existing data if the updateURL value has changed', async function () {
    const manager = new UpdateNotificationManager();
    await manager.fetchUpdateMetadata(httpServerUrl, filename);
    await manager.fetchUpdateMetadata(httpServerUrl + '/?foo=bar', filename);
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
    await manager.fetchUpdateMetadata(httpServerUrl, filename);
    await fs.writeFile(
      filename,
      JSON.stringify({
        ...JSON.parse(await fs.readFile(filename, 'utf8')),
        lastChecked: 0,
      })
    );
    await manager.fetchUpdateMetadata(httpServerUrl, filename);
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
    await manager.fetchUpdateMetadata(httpServerUrl, filename);
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
});
