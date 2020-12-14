/* eslint-disable no-nested-ternary */
import Platform from './platform';
import os from 'os';
import Module from 'module';
import pkgUp from 'pkg-up';
import path from 'path';
import childProcess from 'child_process';
import { once } from 'events';

async function preCompileHook(nodeSourceTree: string) {
  const proc = childProcess.spawn(
    'bash',
    [path.resolve(__dirname, '..', '..', '..', 'scripts', 'prep-fle-addon.sh')],
    {
      env: { ...process.env, FLE_NODE_SOURCE_PATH: nodeSourceTree },
      stdio: 'inherit'
    });
  const [ code ] = await once(proc, 'exit');
  if (code !== 0) {
    throw new Error(`pre-compile hook failed with code ${code}`);
  }
}

async function findModulePath(mod: string): Promise<string> {
  const cliReplRequire = Module.createRequire(path.resolve(__dirname, '..', '..', 'service-provider-server', 'src'));
  return path.dirname(await pkgUp({ cwd: cliReplRequire.resolve(mod) }) as string);
}

/**
 * A compiler that can produce an executable that is actually
 * code signable.
 */
class SignableCompiler {
  sourceFile: string;
  targetFile: string;
  nodeVersionRange: string;

  constructor(sourceFile: string, targetFile: string, nodeVersionRange: string) {
    this.sourceFile = sourceFile;
    this.targetFile = targetFile;
    this.nodeVersionRange = nodeVersionRange;
  }

  /**
   * Compile the executable with the library.
   *
   * @param {Function} exec - The boxednode compile function.
   */
  async compile(exec: (opts: any) => void): Promise<void> {
    const fleAddon = {
      path: await findModulePath('mongodb-client-encryption'),
      requireRegexp: /\bmongocrypt\.node$/
    };

    // This compiles the executable along with Node from source.
    // Evergreen and XCode don't have up to date libraries to compile
    // open ssl with asm so we revert back to the slower version.
    await exec({
      configureArgs:
        os.platform() === Platform.Windows ? ['openssl-no-asm'] :
          os.platform() === Platform.MacOs ? ['--openssl-no-asm'] : [],
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
        fleAddon
      ],
      preCompileHook
    });
  }
}

export default SignableCompiler;
