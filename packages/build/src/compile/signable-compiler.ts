import { promises as fs } from 'fs';
import Module from 'module';
import pkgUp from 'pkg-up';
import path from 'path';
import childProcess from 'child_process';
import { once } from 'events';
import type { PackageInformation } from '../packaging/package';
import { compileJSFileAsBinary } from 'boxednode';

async function preCompileHook(nodeSourceTree: string) {
  const fleAddonVersion = require(path.join(
    await findModulePath(
      'service-provider-node-driver',
      'mongodb-client-encryption'
    ),
    'package.json'
  )).version;
  const proc = childProcess.spawn(
    'bash',
    [
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'scripts',
        'prep-fle-addon.sh'
      ),
    ],
    {
      env: {
        ...process.env,
        FLE_NODE_SOURCE_PATH: nodeSourceTree,
        MONGODB_CLIENT_ENCRYPTION_VERSION: `v${fleAddonVersion}`,
      },
      stdio: 'inherit',
    }
  );
  const [code] = await once(proc, 'exit');
  if (code !== 0) {
    throw new Error(`pre-compile hook failed with code ${code}`);
  }

  const patchDirectory = path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'scripts',
    'nodejs-patches'
  );
  // Sort all entries in the directory so that they are applied
  // in order 001-(...).patch, 002-(...).patch, etc.
  const patchFiles = (await fs.readdir(patchDirectory)).sort();
  for (const entry of patchFiles) {
    const patchFile = path.resolve(patchDirectory, entry);
    console.warn(`Applying patch from ${patchFile}...`);
    // NB: git apply doesn't need to be run in a git repository in order to work
    const proc = childProcess.spawn('git', ['apply', patchFile], {
      cwd: nodeSourceTree,
      stdio: 'inherit',
    });
    const [code] = await once(proc, 'exit');
    if (code !== 0) {
      throw new Error(`applying patch failed with code ${code}`);
    }
  }
}

async function findModulePath(lernaPkg: string, mod: string): Promise<string> {
  const cliReplRequire = Module.createRequire(
    path.resolve(__dirname, '..', '..', '..', lernaPkg, 'src')
  );
  return path.dirname(
    (await pkgUp({ cwd: cliReplRequire.resolve(mod) })) as string
  );
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
    executableMetadata: PackageInformation['metadata']
  ) {
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
      path: await findModulePath(
        'service-provider-node-driver',
        'mongodb-client-encryption'
      ),
      requireRegexp: /\bmongocrypt\.node$/,
    };
    const krbPath = await findModulePath(
      'service-provider-node-driver',
      'kerberos'
    );
    const kerberosAddon = {
      path: krbPath,
      requireRegexp: /\bkerberos\.node$/,
    };
    const krbPatchTarget = path.join(
      krbPath,
      'src',
      'unix',
      'kerberos_unix.cc'
    );
    await fs.writeFile(
      krbPatchTarget,
      (
        await fs.readFile(krbPatchTarget, { encoding: 'utf8' })
      ).replace(/^gss_OID_desc/gm, 'static gss_OID_desc')
    );
    const osDnsAddon = {
      path: await findModulePath(
        'service-provider-node-driver',
        'os-dns-native'
      ),
      requireRegexp: /\bos_dns_native\.node$/,
    };
    const cryptLibraryVersionAddon = {
      path: await findModulePath('cli-repl', 'mongodb-crypt-library-version'),
      requireRegexp: /\bmongodb_crypt_library_version\.node$/,
    };
    const glibcVersionAddon = {
      path: await findModulePath('cli-repl', 'glibc-version'),
      requireRegexp: /\bglibc_version\.node$/,
    };
    const nativeMachineIdAddon = {
      path: await findModulePath('logging', 'native-machine-id'),
      requireRegexp: /\bnative_machine_id\.node$/,
    };
    // Warning! Until https://jira.mongodb.org/browse/MONGOSH-990,
    // packages/service-provider-node-driver *also* has a copy of these.
    // We use the versions included in packages/cli-repl here, so these
    // should be kept in sync!
    const winCAAddon =
      process.platform === 'win32'
        ? {
            path: await findModulePath(
              'cli-repl',
              'win-export-certificate-and-key'
            ),
            requireRegexp: /\bwin_export_cert\.node$/,
          }
        : null;
    const macKeychainAddon =
      process.platform === 'darwin'
        ? {
            path: await findModulePath(
              'cli-repl',
              'macos-export-certificate-and-key'
            ),
            requireRegexp: /\bmacos_export_certificate_and_key\.node$/,
          }
        : null;
    const winConsoleProcessListAddon =
      process.platform === 'win32'
        ? {
            path: await findModulePath('cli-repl', 'get-console-process-list'),
            requireRegexp: /\bget_console_process_list\.node$/,
          }
        : null;

    // This compiles the executable along with Node from source.
    await compileJSFileAsBinary({
      sourceFile: this.sourceFile,
      targetFile: this.targetFile,
      nodeVersionRange: this.nodeVersionRange,
      namespace: 'mongosh',
      env: {
        ...process.env,
        // Custom env vars for sccache:
        AWS_ACCESS_KEY_ID: process.env.DEVTOOLS_CI_AWS_KEY,
        AWS_SECRET_ACCESS_KEY: process.env.DEVTOOLS_CI_AWS_SECRET,
        // https://jira.mongodb.org/browse/MONGOSH-1628
        ...(process.platform === 'linux' && {
          GYP_DEFINES: 'kerberos_use_rtld=true',
        }),
      },
      addons: [
        fleAddon,
        osDnsAddon,
        kerberosAddon,
        cryptLibraryVersionAddon,
        glibcVersionAddon,
        nativeMachineIdAddon,
      ]
        .concat(winCAAddon ? [winCAAddon] : [])
        .concat(winConsoleProcessListAddon ? [winConsoleProcessListAddon] : [])
        .concat(macKeychainAddon ? [macKeychainAddon] : []),
      preCompileHook,
      executableMetadata: this.executableMetadata,
      // Node.js startup snapshots are an experimental feature of Node.js.
      // useCodeCache: true,
      useNodeSnapshot: true,
      // To account for the fact that we are manually patching Node.js to include
      // https://github.com/nodejs/node/pull/50453 until we have caught up with upstream
      nodeSnapshotConfigFlags: ['Default'],
    });
  }
}
