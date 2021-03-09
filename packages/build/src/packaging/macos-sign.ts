import { notarize as nodeNotarize } from 'electron-notarize';
import codesign from 'node-codesign';
import util from 'util';
import { Config } from '../config';
import { PackageFile } from './package';

export async function macOSSignAndNotarize(
  executables: string[],
  config: Config,
  runCreatePackage: () => Promise<PackageFile>,
  signFn: typeof sign = sign,
  notarizeFn: typeof notarize = notarize,
): Promise<PackageFile> {
  for (const executable of executables) {
    console.info('mongosh: signing:', executable);
    await signFn(executable, config.appleCodesignIdentity || '', config.appleCodesignEntitlementsFile || '');
  }
  const artifact = await runCreatePackage();
  console.info('mongosh: notarizing and creating tarball:', artifact.path);
  await notarizeFn(
    config.appleNotarizationBundleId || '',
    artifact.path,
    config.appleNotarizationUsername || '',
    config.appleNotarizationApplicationPassword || '');
  return artifact;
}

/**
 * Notarizes the zipped mongosh. Will send the tarball to Apple and poll apple
 * for the notarization result.
 *
 * @param {string} bundleId - The bundle id (com.mongodb.mongosh)
 * @param {string} artifact - The path to the tarball.
 * @param {string} user - The apple dev account user.
 * @param {string} password - The apple dev account password.
 */
function notarize(bundleId: string, artifact: string, user: string, password: string): Promise<void> {
  return nodeNotarize({
    appBundleId: bundleId,
    appPath: artifact,
    appleId: user,
    appleIdPassword: password
  });
}

/**
 * Signs the executable via codesign.
 *
 * @param {string} executable - The mongosh executable.
 * @param {string} identity - The apple developer identity.
 */
function sign(executable: string, identity: string, entitlementsFile: string): Promise<void> {
  return util.promisify(codesign)({
    identity: identity,
    appPath: executable,
    entitlements: entitlementsFile,
  });
}
