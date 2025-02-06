import type { EvaluationListener } from '@mongosh/shell-api';
import { signatures } from '@mongosh/shell-api';
import { SnippetManager } from './snippet-manager';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import { once } from 'events';
import http from 'http';
import zlib from 'zlib';
import bson from 'bson';
import path from 'path';
import { promises as fs, createReadStream } from 'fs';
import Nanobus from 'nanobus';
import { eventually } from '../../../testing/eventually';
chai.use(sinonChai);

describe('SnippetManager', function () {
  let httpServer: http.Server;
  let httpRequests: any[];
  let baseURL = '';
  let indexData: any;
  let indexData2: any;
  let installdir: string;
  let snippetAutoload: boolean;
  let contextObject: any;
  let makeSnippetManager: () => SnippetManager;
  let snippetManager: SnippetManager;
  let tmpdir: string;
  let indexURL: string;
  let registryURL: string;
  let evaluationListener: StubbedInstance<EvaluationListener>;
  let busMessages: { ev: any; data?: any }[];
  let interrupted: any;

  beforeEach(async function () {
    busMessages = [];
    httpRequests = [];
    httpServer = http
      .createServer((req, res) => {
        httpRequests.push(req.url);
        switch (req.url) {
          case '/index2.bson.br':
          case '/index.bson.br': {
            res.writeHead(200, {
              'Content-type': 'application/x-mongosh-snippet-index',
            });
            const compress = zlib.createBrotliCompress();
            compress.end(
              bson.serialize(
                req.url === '/index.bson.br' ? indexData : indexData2
              )
            );
            compress.pipe(res);
            break;
          }
          case '/brokenregistry/npm/latest': {
            res.writeHead(200, { 'Content-type': 'application/json' });
            res.end(
              JSON.stringify({
                dist: {
                  tarball: null,
                },
              })
            );
            break;
          }
          case '/brokenregistry2/npm/latest': {
            res.writeHead(200, { 'Content-type': 'application/json' });
            res.end(
              JSON.stringify({
                dist: {
                  tarball: `${baseURL}/notfound.tgz`,
                },
              })
            );
            break;
          }
          case '/registry/npm/latest': {
            res.writeHead(200, { 'Content-type': 'application/json' });
            res.end(
              JSON.stringify({
                dist: {
                  tarball: `${baseURL}/npm-7.15.0.tgz`,
                },
              })
            );
            break;
          }
          case '/registry/npm': {
            res.writeHead(200, { 'Content-type': 'application/json' });
            res.end(
              JSON.stringify({
                _id: 'npm',
                name: 'npm',
                'dist-tags': { latest: '7.15.0' },
                versions: {
                  '7.15.0': {
                    name: 'npm',
                    version: '7.15.0',
                    _id: 'npm@7.15.0',
                    dist: {
                      integrity:
                        'sha512-GIXNqy3obii54oPF0gbcBNq4aYuB/Ovuu/uYp1eS4nij2PEDMnoOh6RoSv2MDvAaB4a+JbpX/tjDxLO7JAADgQ==',
                      shasum: '85f0ff4ff222c01a2cc0164cf5d81c5a24994894',
                      tarball: `${baseURL}/npm-7.15.0.tgz`,
                    },
                  },
                },
              })
            );
            break;
          }
          case '/registry/bson': {
            res.writeHead(200, { 'Content-type': 'application/json' });
            res.end(
              JSON.stringify({
                _id: 'bson',
                name: 'bson',
                'dist-tags': { latest: '4.4.0' },
                versions: {
                  '4.4.0': {
                    name: 'bson',
                    version: '4.4.0',
                    _id: 'bson@4.4.0',
                    dist: {
                      integrity:
                        'sha512-uX9Zqzv2DpFXJgQOWKD8nbf0dTQV57WM8eiXDXVWeJYgiu/zIRz61OGLJKwbfSEEjZJ+AgS+7TUT7Y8EloTaqQ==',
                      shasum: '6a4cac7de8c5cc24a9bcc059cd42a9852e2bad4a',
                      tarball: `${baseURL}/bson-4.4.0.tgz`,
                    },
                    dependencies: {
                      buffer: '^5.6.0',
                    },
                  },
                },
              })
            );
            break;
          }
          case '/registry/buffer': {
            // Providing a dummy 'buffer' pkg is important for testing that
            // packages can have regular npm dependencies. The version of the
            // buffer package included here has its nested dependencies removed
            // to reduce complexity.
            res.writeHead(200, { 'Content-type': 'application/json' });
            res.end(
              JSON.stringify({
                _id: 'buffer',
                name: 'buffer',
                'dist-tags': { latest: '5.7.1' },
                versions: {
                  '5.7.1': {
                    name: 'buffer',
                    version: '5.7.1',
                    _id: 'buffer@5.7.1',
                    dist: {
                      integrity:
                        'sha512-YG4pBaPbbnuPvoy8kXTU6fP0rwlSfCOuAzCIe9CGNLIWCvRSiJiQdX1fqws4CaRWI79v/ZjOur6yiUwX4Cwy9Q==',
                      shasum: 'e3c0e22c35da5e934d464d3f1e1bfa328284745d',
                      tarball: `${baseURL}/buffer-5.7.1.tgz`,
                    },
                  },
                },
              })
            );
            break;
          }
          case '/tarballed-example-file.tgz':
          case '/buffer-5.7.1.tgz':
          case '/bson-4.4.0.tgz':
          case '/npm-7.15.0.tgz': {
            res.writeHead(200, { 'Content-type': 'application/octet-stream' });
            const source = createReadStream(
              path.join(__dirname, '..', 'test', 'fixtures', '.' + req.url)
            );
            source.pipe(res);
            break;
          }
          case '/notindexfile': {
            res.writeHead(200, { 'Content-type': 'text/plain' });
            res.end('This is not an index file');
            break;
          }
          case '/notindexfile2': {
            res.writeHead(200, { 'Content-type': 'text/plain' });
            const compress = zlib.createBrotliCompress();
            compress.end('Not BSON data');
            compress.pipe(res);
            break;
          }
          default: {
            res.writeHead(404, { 'Content-type': 'text/plain' });
            res.end('Not Found');
            break;
          }
        }
      })
      .listen(0);
    await once(httpServer, 'listening');
    baseURL = `http://localhost:${(httpServer.address() as any).port}`;
    indexURL = `${baseURL}/index.bson.br`;
    registryURL = `${baseURL}/registry`;
    snippetAutoload = true;
    indexData = {
      indexFileVersion: 1,
      index: [
        {
          name: 'bson',
          snippetName: 'bson-example',
          version: '4.3.0',
          description: 'Placeholder text one',
          errorMatchers: [
            {
              matches: [/undefined is not a function/],
              message: 'Have you tried turning it off and on again?',
            },
          ],
          readme: 'Help text!',
          license: 'Apache-2.0',
        },
        {
          name: 'mongodb',
          snippetName: 'mongodb-example',
          version: '4.0.0-beta.3',
          description: 'Placeholder text two',
          license: 'Apache-2.0',
          readme: '',
        },
      ],
      metadata: {
        homepage: 'https://example.org',
        bugs: 'https://bugs.example.org',
      },
    };
    indexData2 = {
      indexFileVersion: 1,
      index: [
        {
          name: 'tarballed-example-snippet-name',
          snippetName: 'tarballed-example',
          installSpec: `${baseURL}/tarballed-example-file.tgz`,
          version: '1.2.3',
          description: 'Placeholder text three',
          license: 'Apache-2.0',
          readme: 'Please do not read me',
        },
        {
          name: 'snippet-without-installation-candidate',
          snippetName: 'snippet-without-installation-candidate',
          version: '3.2.1',
          description: 'Placeholder text three',
          license: 'Apache-2.0',
          readme: '',
        },
      ],
      metadata: {
        homepage: 'https://example.org',
      },
    };

    tmpdir = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'tmp',
      `snippettest-${Date.now()}-${Math.random()}`
    );
    installdir = path.join(tmpdir, 'snippets');
    contextObject = {
      config: {
        // eslint-disable-next-line @typescript-eslint/require-await
        async get(key: string): Promise<any> {
          switch (key) {
            case 'snippetIndexSourceURLs':
              return indexURL;
            case 'snippetRegistryURL':
              return registryURL;
            case 'snippetAutoload':
              return snippetAutoload;
            default:
              throw new Error(`Don’t know what to do with config key ${key}`);
          }
        },
      },
      load: sinon.stub(),
      print: sinon.stub(),
      require,
    };
    evaluationListener = stubInterface<EvaluationListener>();
    interrupted = {
      asPromise: sinon.stub(),
      checkpoint: sinon.stub(),
    };
    interrupted.asPromise.callsFake(() => ({
      destroy: () => {},
      promise: new Promise(() => {}),
    }));
    interrupted.checkpoint.returns();

    const messageBus = new Nanobus('mongosh-snippet-test');
    makeSnippetManager = () =>
      new SnippetManager({
        installdir,
        instanceState: {
          context: contextObject,
          shellApi: contextObject,
          evaluationListener,
          registerPlugin: sinon.stub(),
          messageBus,
          interrupted,
        } as any,
      });
    snippetManager = makeSnippetManager();
    messageBus.on('*', (ev: any, data: any) => {
      if (typeof data === 'number') {
        busMessages.push({ ev });
      } else {
        busMessages.push({ ev, data });
      }
    });

    // make nyc happy when we spawn npm below
    await fs.mkdir(
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'tmp',
        '.nyc_output',
        'processinfo'
      ),
      { recursive: true }
    );
  });

  afterEach(async function () {
    await eventually(async () => {
      // This can fail when an index fetch is being written while we are removing
      // the directory; hence, try again.
      await fs.rmdir(tmpdir, { recursive: true });
    });
    httpServer.close();
  });

  it('tries to fetch index data when the plugin starts', async function () {
    await snippetManager.inflightFetchIndexPromise;
    expect(snippetManager.repos).to.deep.equal([
      {
        indexFileVersion: 1,
        index: indexData.index,
        metadata: indexData.metadata,
        sourceURL: indexURL,
      },
    ]);
  });

  it('provides a help text when using `snippet help`', async function () {
    const result = await snippetManager.runSnippetCommand(['help']);
    expect(result).to.include('snippet install');
  });

  it('suggests using `snippet help` when using `snippet notacommand`', async function () {
    const result = await snippetManager.runSnippetCommand(['notacommand']);
    expect(result).to.include("Run 'snippet help'");
  });

  it('provides information about where snippet get its data from when using `snippet info`', async function () {
    const result = await snippetManager.runSnippetCommand(['info']);
    expect(result).to.match(
      /^Snippet repository URL:\s*http:\/\/localhost:\d+\/index.bson.br$/m
    );
    expect(result).to.match(/^\s+-->\s+Homepage:\s+https:\/\/example.org$/m);
  });

  it('provides information about specific packages `snippet help <pkg>`', async function () {
    const result = await snippetManager.runSnippetCommand([
      'help',
      'bson-example',
    ]);
    expect(result).to.equal('Help text!');
    try {
      await snippetManager.runSnippetCommand(['help', 'mongodb-example']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal(
        'No help information available for "mongodb-example"'
      );
    }
    try {
      await snippetManager.runSnippetCommand(['help', 'alhjgfakjhf']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal('Unknown snippet "alhjgfakjhf"');
    }
  });

  it('lists all available packages when using `snippet search`', async function () {
    const result = await snippetManager.runSnippetCommand(['search']);
    expect(result).to.match(
      /bson-example.+│.+4\.3\.0.+│.+Placeholder text one/
    );
    expect(result).to.match(
      /mongodb-example.+│.+4\.0\.0.+│.+Placeholder text two/
    );
  });

  it('rewrites errors based on provided error matchers', async function () {
    expect(
      snippetManager.transformError(new Error('undefined is not a function'))
        .message
    ).to.equal('undefined is not a function');
    await snippetManager.inflightFetchIndexPromise;
    expect(
      snippetManager.transformError(new Error('undefined is not a function'))
        .message
    ).to.equal(
      'undefined is not a function (Have you tried turning it off and on again?)'
    );
    expect(
      snippetManager.transformError(new Error('foo is not a function')).message
    ).to.equal('foo is not a function');
  });

  it('will fail when trying to use `snippet install unknownsnippet`', async function () {
    try {
      await snippetManager.runSnippetCommand(['install', 'unknownsnippet']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal('Unknown snippet "unknownsnippet"');
    }
  });

  it('will fail when indexFileVersion mismatches', async function () {
    try {
      indexData.indexFileVersion = 20000;
      await snippetManager.runSnippetCommand(['refresh']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.include(
        `The specified index file ${indexURL} is not a valid index file:`
      );
      expect(err.message).to.include(`Number must be less than or equal to 1`);
    }
  });

  it('will fail when the index URI is inaccessible', async function () {
    await snippetManager.inflightFetchIndexPromise;
    try {
      indexURL = `${baseURL}/404`;
      await snippetManager.runSnippetCommand(['refresh']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal(
        `The specified index file ${indexURL} could not be read: Not Found`
      );
    }
  });

  it('will fail when the index URI returns data in the wrong format (not .br)', async function () {
    await snippetManager.inflightFetchIndexPromise;
    try {
      indexURL = `${baseURL}/notindexfile`;
      await snippetManager.runSnippetCommand(['refresh']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal(
        `The specified index file ${indexURL} could not be parsed: Decompression failed`
      );
    }
  });

  it('will fail when the index URI returns data in the wrong format (not .bson.br)', async function () {
    await snippetManager.inflightFetchIndexPromise;
    try {
      indexURL = `${baseURL}/notindexfile2`;
      await snippetManager.runSnippetCommand(['refresh']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal(
        `The specified index file ${indexURL} could not be parsed: buffer length 13 must === bson size 544501582`
      );
    }
  });

  it('manages packages on disk', async function () {
    (evaluationListener.onPrompt as any).resolves('yes');
    await snippetManager.runSnippetCommand(['install', 'bson-example']);
    expect(contextObject.print).to.have.been.calledWith('Running install...');

    const installedPkgJson = path.join(
      installdir,
      'node_modules',
      'bson',
      'package.json'
    );
    const installed = JSON.parse(await fs.readFile(installedPkgJson, 'utf8'));
    expect(installed.name).to.equal('bson');
    expect(installed.version).to.equal('4.4.0');

    expect(evaluationListener.onPrompt).to.have.been.calledWith(
      'Installed new snippets bson-example. Do you want to load them now? [Y/n]',
      'yesno'
    );
    expect(contextObject.load).to.have.been.calledWith(
      path.resolve(installedPkgJson, '..', installed.main)
    );

    // Verify that load is called once because the user said yes, and again
    // if we emit an 'loadAllSnippets' call.
    expect(
      contextObject.load.getCalls().map(({ args }: any) => args)
    ).to.deep.equal([
      [
        path.resolve(
          tmpdir,
          'snippets',
          'node_modules',
          'bson',
          'lib',
          'bson.js'
        ),
      ],
    ]);
    await snippetManager.runSnippetCommand(['load-all']);
    expect(
      contextObject.load.getCalls().map(({ args }: any) => args)
    ).to.deep.equal([
      [
        path.resolve(
          tmpdir,
          'snippets',
          'node_modules',
          'bson',
          'lib',
          'bson.js'
        ),
      ],
      [
        path.resolve(
          tmpdir,
          'snippets',
          'node_modules',
          'bson',
          'lib',
          'bson.js'
        ),
      ],
    ]);

    // Verify that an extra loadAllSnippets call is a no-op if autoload is off.
    expect(contextObject.load).to.have.callCount(2);
    snippetAutoload = false;
    await snippetManager.loadAllSnippets();
    expect(contextObject.load).to.have.callCount(2);
    // Verify that load-all ignores this.
    await snippetManager.runSnippetCommand(['load-all']);
    expect(contextObject.load).to.have.callCount(3);

    {
      const result = await snippetManager.runSnippetCommand(['ls']);
      expect(result).to.include(installdir);
      expect(result).to.match(/mongosh:bson-example@\d+\.\d+\.\d+/);
    }

    {
      installed.version = '0.2.0'; // not up to date in any case
      await fs.writeFile(installedPkgJson, JSON.stringify(installed));
      await eventually(async () => {
        // Remove the "hidden" package lock created by npm 7.x+ as well:
        const hiddenPkgLock = path.resolve(
          tmpdir,
          'snippets',
          'node_modules',
          '.package-lock.json'
        );
        let exists = false;
        try {
          await fs.stat(hiddenPkgLock);
          exists = true;
        } catch {
          /* does not exist, all good */
        }
        if (exists) {
          await fs.unlink(hiddenPkgLock);
        }
      });
      const result = await snippetManager.runSnippetCommand(['outdated']);
      expect(result).to.match(/mongosh:bson-example\s+0\.2\.0/);
    }

    {
      await snippetManager.runSnippetCommand(['update']);
      const result = await snippetManager.runSnippetCommand(['outdated']);
      expect(result.trim()).to.equal('');
    }

    {
      await snippetManager.runSnippetCommand(['uninstall', 'bson-example']);
      const result = await snippetManager.runSnippetCommand(['ls']);
      expect(result).to.match(/\b(empty|npm@7.15.0)\b/);
      expect(contextObject.print).to.have.been.calledWith(
        'Running uninstall...'
      );
    }

    const npmlog = [
      'npm',
      '--no-package-lock',
      '--ignore-scripts',
      '--loglevel=notice',
      `--registry=${registryURL}`,
    ];
    for (const { ev, data } of busMessages) {
      // We don't want to compare against a fixed npm version here.
      if (ev === 'mongosh-snippets:npm-lookup') {
        data.existingVersion = '<version>';
      }
      // Reduce full error message to just 'ENOENT'
      if (ev === 'mongosh-snippets:package-json-edit-error') {
        data.error = 'ENOENT';
      }
    }
    expect(busMessages).to.deep.equal([
      {
        ev: 'mongosh-snippets:snippet-command',
        data: { args: ['install', 'bson-example'] },
      },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: ['npm', '--version'] },
      },
      { ev: 'mongosh-snippets:fetch-index-done' },
      {
        ev: 'mongosh-snippets:npm-lookup',
        data: { existingVersion: '<version>' },
      },
      {
        ev: 'mongosh-snippets:package-json-edit-error',
        data: { error: 'ENOENT' },
      },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: [...npmlog, 'install', '--save', 'bson@*'] },
      },
      {
        ev: 'mongosh-snippets:load-snippet',
        data: { source: 'install', name: 'bson' },
      },
      { ev: 'mongosh-snippets:snippet-command', data: { args: ['load-all'] } },
      {
        ev: 'mongosh-snippets:load-snippet',
        data: { source: 'load-all', name: 'bson' },
      },
      { ev: 'mongosh-snippets:snippet-command', data: { args: ['load-all'] } },
      {
        ev: 'mongosh-snippets:load-snippet',
        data: { source: 'load-all', name: 'bson' },
      },
      { ev: 'mongosh-snippets:snippet-command', data: { args: ['ls'] } },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: [...npmlog, 'ls', '--depth=0'] },
      },
      { ev: 'mongosh-snippets:snippet-command', data: { args: ['outdated'] } },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: [...npmlog, 'outdated'] },
      },
      { ev: 'mongosh-snippets:snippet-command', data: { args: ['update'] } },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: [...npmlog, 'update', '--save'] },
      },
      { ev: 'mongosh-snippets:snippet-command', data: { args: ['outdated'] } },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: [...npmlog, 'outdated'] },
      },
      {
        ev: 'mongosh-snippets:snippet-command',
        data: { args: ['uninstall', 'bson-example'] },
      },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: [...npmlog, 'uninstall', '--save', 'bson'] },
      },
      { ev: 'mongosh-snippets:snippet-command', data: { args: ['ls'] } },
      {
        ev: 'mongosh-snippets:spawn-child',
        data: { args: [...npmlog, 'ls', '--depth=0'] },
      },
    ]);
  });

  it('can install from a tarball (consistency check: fails without second index)', async function () {
    (evaluationListener.onPrompt as any).resolves('yes');
    try {
      await snippetManager.runSnippetCommand(['install', 'tarballed-example']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.equal('Unknown snippet "tarballed-example"');
    }
  });

  it('can install from a tarball', async function () {
    await snippetManager.inflightFetchIndexPromise;
    indexURL = `${baseURL}/index.bson.br;${baseURL}/index2.bson.br;`;
    (evaluationListener.onPrompt as any).resolves('yes');
    await snippetManager.runSnippetCommand(['install', 'tarballed-example']);
    expect(contextObject.load).to.have.been.calledWith(
      path.resolve(
        installdir,
        'node_modules',
        'tarballed-example-snippet-name',
        'index.js'
      )
    );
  });

  it('reports back errors if npm fails', async function () {
    await snippetManager.inflightFetchIndexPromise;
    indexURL = `${baseURL}/index.bson.br;${baseURL}/index2.bson.br;`;
    (evaluationListener.onPrompt as any).resolves('yes');
    try {
      await snippetManager.runSnippetCommand([
        'install',
        'snippet-without-installation-candidate',
      ]);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.message).to.match(/^Command failed:.+npm/);
      expect(err.message).to.include('E404');
    }
  });

  it('fails when the package.json in question is not readable valid JSON', async function () {
    await fs.mkdir(installdir, { recursive: true });
    await fs.writeFile(path.join(installdir, 'package.json'), 'notjson');
    try {
      await snippetManager.runSnippetCommand(['install', 'bson-example']);
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.name).to.equal('SyntaxError');
      expect(err.message).to.include('JSON');
    }
  });

  context('without a recent npm in $PATH', function () {
    let origPath = '';
    before(function () {
      origPath = process.env.PATH ?? '';
      process.env.PATH =
        path.resolve(__dirname, '..', 'test', 'fixtures', 'fakenpm5') +
        path.delimiter +
        process.env.PATH;
    });
    after(function () {
      process.env.PATH = origPath;
    });

    it('does not download npm if asked not to', async function () {
      (evaluationListener.onPrompt as any).resolves('no');
      try {
        await snippetManager.runSnippetCommand(['install', 'bson-example']);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('Stopped by user request');
      }
    });

    it('downloads npm if asked to', async function () {
      (evaluationListener.onPrompt as any).resolves('yes');
      await snippetManager.runSnippetCommand(['install', 'bson-example']);
      expect(contextObject.print).to.have.been.calledWith(
        `Downloading npm from ${baseURL}/npm-7.15.0.tgz...`
      );

      for (const pkg of ['bson', 'npm']) {
        const installedPkgJson = path.join(
          installdir,
          'node_modules',
          pkg,
          'package.json'
        );
        const installed = JSON.parse(
          await fs.readFile(installedPkgJson, 'utf8')
        );
        expect(installed.name).to.equal(pkg);
      }

      const fullPkgJson = JSON.parse(
        await fs.readFile(path.join(installdir, 'package.json'), 'utf8')
      );
      expect(Object.keys(fullPkgJson.dependencies)).to.deep.equal([
        'bson',
        'npm',
      ]);

      // The downloaded npm is not included in the a `snippet load-all` call:
      expect(
        contextObject.load.getCalls().map(({ args }: any) => args)
      ).to.deep.equal([
        [
          path.resolve(
            tmpdir,
            'snippets',
            'node_modules',
            'bson',
            'lib',
            'bson.js'
          ),
        ],
      ]);
      await snippetManager.runSnippetCommand(['load-all']);
      expect(
        contextObject.load.getCalls().map(({ args }: any) => args)
      ).to.deep.equal([
        [
          path.resolve(
            tmpdir,
            'snippets',
            'node_modules',
            'bson',
            'lib',
            'bson.js'
          ),
        ],
        [
          path.resolve(
            tmpdir,
            'snippets',
            'node_modules',
            'bson',
            'lib',
            'bson.js'
          ),
        ],
      ]);

      // A new snippet manager also uses the new npm.
      expect(evaluationListener.onPrompt).to.have.callCount(2);
      snippetManager = makeSnippetManager();
      expect(await snippetManager.runSnippetCommand(['ls'])).to.include(
        'mongosh:bson-example@4.4.0'
      );
      expect(evaluationListener.onPrompt).to.have.callCount(2);
    });

    it('fails if it tries to download npm but the registry is missing', async function () {
      registryURL = `${baseURL}/missingregistry`;
      (evaluationListener.onPrompt as any).resolves('yes');
      snippetManager = makeSnippetManager();
      try {
        await snippetManager.runSnippetCommand(['install', 'bson-example']);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal(
          `Failed to download npm: ${registryURL}/npm/latest: Not Found`
        );
      }
    });

    it('fails if it tries to download npm but the registry response is invalid', async function () {
      registryURL = `${baseURL}/brokenregistry`;
      (evaluationListener.onPrompt as any).resolves('yes');
      snippetManager = makeSnippetManager();
      try {
        await snippetManager.runSnippetCommand(['install', 'bson-example']);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal(
          `Failed to download npm: ${registryURL}/npm/latest: Registry returned no download source`
        );
      }
    });

    it('fails if it tries to download npm but the registry response points to a missing file', async function () {
      registryURL = `${baseURL}/brokenregistry2`;
      (evaluationListener.onPrompt as any).resolves('yes');
      snippetManager = makeSnippetManager();
      try {
        await snippetManager.runSnippetCommand(['install', 'bson-example']);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal(
          `Failed to download npm: ${baseURL}/notfound.tgz: Not Found`
        );
      }
    });
  });

  it('re-fetches cached data if it is outdated', async function () {
    {
      const result = await snippetManager.runSnippetCommand(['info']);
      expect(result).to.include('https://example.org');
    }

    const yesterday = Date.now() / 1000 - 86400;
    await fs.utimes(
      path.join(installdir, 'index.bson.br'),
      yesterday,
      yesterday
    );
    indexData.metadata.homepage = 'https://somethingelse.example.org';

    snippetManager = makeSnippetManager();

    {
      const result = await snippetManager.runSnippetCommand(['info']);
      expect(result).to.include('https://example.org');
    }

    await snippetManager.inflightFetchIndexPromise;
    {
      const result = await snippetManager.runSnippetCommand(['info']);
      expect(result).to.include('https://somethingelse.example.org');
    }

    expect([...new Set(httpRequests)]).to.deep.equal(['/index.bson.br']);
  });

  it('re-fetches cached data if explicitly asked to', async function () {
    await snippetManager.inflightFetchIndexPromise;

    expect(await snippetManager.runSnippetCommand(['info'])).to.include(
      'https://example.org'
    );
    indexData.metadata.homepage = 'https://somethingelse.example.org';
    await snippetManager.runSnippetCommand(['refresh']);
    await snippetManager.runSnippetCommand(['info']);
    expect(await snippetManager.runSnippetCommand(['info'])).to.include(
      'https://somethingelse.example.org'
    );
  });

  it('re-fetches cached data if it needs to because the index source URLs have changed', async function () {
    await snippetManager.inflightFetchIndexPromise;

    expect(await snippetManager.runSnippetCommand(['info'])).to.include(
      'https://example.org'
    );

    indexData.metadata.homepage = 'https://somethingelse.example.org';
    indexURL = `${baseURL}/index.bson.br;${baseURL}/index2.bson.br;`;

    snippetManager = makeSnippetManager();
    await snippetManager.inflightFetchIndexPromise;
    await snippetManager.runSnippetCommand(['info']);
    expect(await snippetManager.runSnippetCommand(['info'])).to.include(
      'https://somethingelse.example.org'
    );
    expect(busMessages).to.deep.include({
      ev: 'mongosh-snippets:fetch-cache-invalid',
    });
  });

  it('does not fail loadAllSnippets if the target directory is inaccessible by default', async function () {
    if (process.platform === 'win32') {
      return;
    }
    installdir = '/nonexistent';
    snippetManager = makeSnippetManager();
    await snippetManager.loadAllSnippets(); // no exception
    try {
      await snippetManager.loadAllSnippets('always'); // yes exception
      expect.fail('missed exception');
    } catch (err: any) {
      expect(err.code).to.equal('ENOENT');
    }
  });

  describe('interruption support', function () {
    it('commands methods like load-all perform interruption checkpoints', async function () {
      await snippetManager.inflightFetchIndexPromise;
      indexURL = `${baseURL}/index.bson.br;${baseURL}/index2.bson.br;`;
      await snippetManager.runSnippetCommand(['refresh']);

      (evaluationListener.onPrompt as any).resolves('yes');
      // eslint-disable-next-line @typescript-eslint/require-await
      contextObject.load.callsFake(async () => {
        interrupted.checkpoint.throws(new Error('interrupted'));
      });
      try {
        await snippetManager.runSnippetCommand([
          'install',
          'bson-example',
          'tarballed-example',
        ]);
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('interrupted');
      }
      expect(contextObject.load).to.have.callCount(1);
      expect(interrupted.checkpoint).to.have.been.called;
    });

    it('kills npm commands when interrupted', async function () {
      // Waiting for the initial fetch also ensures that the installdir actually
      // exists.
      await snippetManager.inflightFetchIndexPromise;

      let rejectInterrupt: any;
      const interruptPromise = new Promise((_resolve, reject) => {
        rejectInterrupt = reject;
      });
      interruptPromise.catch(() => {}); // Suppress UnhandledPromiseRejectionWarning
      interrupted.asPromise.returns({
        promise: interruptPromise,
        destroy: () => {},
      });

      // eslint-disable-next-line @typescript-eslint/require-await
      snippetManager.ensureSetup = async () => {
        return [
          process.execPath,
          path.resolve(__dirname, '..', 'test', 'fixtures', 'infinite-sleep'),
        ];
      };
      const npmPromise = snippetManager.runNpm('ls');
      let pid = -1;
      await eventually(async () => {
        pid = +(await fs.readFile(
          path.join(installdir, 'infinite-sleep.pid'),
          'utf8'
        ));
      });
      expect(pid).to.not.equal(-1);

      process.kill(pid, 0);

      rejectInterrupt(new Error('interrupted'));
      try {
        await npmPromise;
        expect.fail('missed exception');
      } catch (err: any) {
        expect(err.message).to.equal('interrupted');
      }

      // process.kill(pid) should fail now because the child process has exited
      // or is about to do so.
      await eventually(() => {
        try {
          process.kill(pid, 0);
        } catch {
          return;
        }
        expect.fail('process.kill() should not succeed');
      });
    });
  });

  describe('wrapper fn', function () {
    it('returns a "synthetic" promise', async function () {
      const result = contextObject.snippet('info');
      expect(result[Symbol.for('@@mongosh.syntheticPromise')]).to.equal(true);
      expect(await result).to.be.a('string');
    });
  });

  describe('autocompletion support', function () {
    let completer: any;

    beforeEach(function () {
      // TODO: https://bit.ly/3yOlrJX
      completer = (signatures as any).ShellApi.attributes.snippet
        .shellCommandCompleter;
    });

    it('completes commands', async function () {
      expect(await completer(null, ['snippet', 'l'])).to.deep.equal([
        'ls',
        'load-all',
      ]);
    });

    it('completes partial snippet names', async function () {
      await snippetManager.inflightFetchIndexPromise;
      expect(await completer(null, ['snippet', 'install', 'm'])).to.deep.equal([
        'mongodb-example',
      ]);
    });

    it('completes all snippet names when no prefix is provided', async function () {
      await snippetManager.inflightFetchIndexPromise;
      expect(await completer(null, ['snippet', 'install'])).to.deep.equal([
        'install bson-example',
        'install mongodb-example',
      ]);
    });

    it('does not provide top-level completion', async function () {
      // This one is really just for the coverage.
      expect(await completer(null, ['snippet'])).to.deep.equal(undefined);
    });
  });
});
