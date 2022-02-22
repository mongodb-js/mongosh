/* eslint-disable no-nested-ternary */
import os from 'os';
import Module from 'module';
import pkgUp from 'pkg-up';
import path from 'path';
import childProcess from 'child_process';
import { once } from 'events';
import type { PackageInformation } from '../packaging/package';
import { compileJSFileAsBinary } from 'boxednode';

async function preCompileHook(nodeSourceTree: string) {
  const fleAddonVersion = require(path.join(
    await findModulePath('service-provider-server', 'mongodb-client-encryption'),
    'package.json')).version;
  const proc = childProcess.spawn(
    'bash',
    [path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'prep-fle-addon.sh')],
    {
      env: {
        ...process.env,
        FLE_NODE_SOURCE_PATH: nodeSourceTree,
        LIBMONGOCRYPT_VERSION: `node-v${fleAddonVersion}`
      },
      stdio: 'inherit'
    });
  const [ code ] = await once(proc, 'exit');
  if (code !== 0) {
    throw new Error(`pre-compile hook failed with code ${code}`);
  }
}

async function findModulePath(lernaPkg: string, mod: string): Promise<string> {
  const cliReplRequire = Module.createRequire(path.resolve(__dirname, '..', '..', '..', lernaPkg, 'src'));
  return path.dirname(await pkgUp({ cwd: cliReplRequire.resolve(mod) }) as string);
}

/**
 * A compiler that can produce an executable that is actually
 * code signable.
 */
export class SignableCompiler {
  sourceFile: string;
  targetFile: string;
  nodeVersionRange: string;
  executableMetadata: PackageInformation['metadata'];

  constructor(
    sourceFile: string,
    targetFile: string,
    nodeVersionRange: string,
    executableMetadata: PackageInformation['metadata']) {
    this.sourceFile = sourceFile;
    this.targetFile = targetFile;
    this.nodeVersionRange = nodeVersionRange;
    this.executableMetadata = executableMetadata;
  }

  /**
   * Compile the executable with the library.
   *
   * @param {Function} exec - The boxednode compile function.
   */
  async compile(): Promise<void> {
    const fleAddon = {
      path: await findModulePath('service-provider-server', 'mongodb-client-encryption'),
      requireRegexp: /\bmongocrypt\.node$/
    };
    const kerberosAddon = {
      path: await findModulePath('service-provider-server', 'kerberos'),
      requireRegexp: /\bkerberos\.node$/
    };
    const osDnsAddon = {
      path: await findModulePath('service-provider-server', 'os-dns-native'),
      requireRegexp: /\bos_dns_native\.node$/
    };
    // Warning! Until https://jira.mongodb.org/browse/MONGOSH-990,
    // packages/service-provider-server *also* has a copy of these.
    // We use the versions included in packages/cli-repl here, so these
    // should be kept in sync!
    const winCAAddon = process.platform === 'win32' ? {
      path: await findModulePath('cli-repl', 'win-export-certificate-and-key'),
      requireRegexp: /\bwin_export_cert\.node$/
    } : null;
    const macKeychainAddon = process.platform === 'darwin' ? {
      path: await findModulePath('cli-repl', 'macos-export-certificate-and-key'),
      requireRegexp: /\bmacos_export_certificate_and_key\.node$/
    } : null;
    const winConsoleProcessListAddon = process.platform === 'win32' ? {
      path: await findModulePath('cli-repl', 'get-console-process-list'),
      requireRegexp: /\bget_console_process_list\.node$/
    } : null;

    // This compiles the executable along with Node from source.
    // Evergreen and XCode don't have up to date libraries to compile
    // open ssl with asm so we revert back to the slower version.
    await compileJSFileAsBinary({
      configureArgs:
        os.platform() === 'win32' ? ['openssl-no-asm'] :
          os.platform() === 'darwin' ? ['--openssl-no-asm'] : [],
      sourceFile: this.sourceFile,
      targetFile: this.targetFile,
      nodeVersionRange: this.nodeVersionRange,
      namespace: 'mongosh',
      env: {
        ...process.env,
        // Custom env vars for sccache:
        AWS_ACCESS_KEY_ID: process.env.DEVTOOLS_CI_AWS_KEY,
        AWS_SECRET_ACCESS_KEY: process.env.DEVTOOLS_CI_AWS_SECRET
      },
      addons: [
        fleAddon,
        osDnsAddon,
        kerberosAddon
      ].concat(winCAAddon ? [
        winCAAddon
      ] : []).concat(winConsoleProcessListAddon ? [
        winConsoleProcessListAddon
      ] : []).concat(macKeychainAddon ? [
        macKeychainAddon
      ] : []),
      preCompileHook,
      executableMetadata: this.executableMetadata
    });
  }
}
