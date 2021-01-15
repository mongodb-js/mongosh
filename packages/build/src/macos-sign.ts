import util from 'util';
import codesign from 'node-codesign';
import { notarize as nodeNotarize } from 'electron-notarize';
import Config from './config';
import { TarballFile } from './tarball';

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

const macOSSignAndNotarize = async(
  executables: string[],
  config: Config,
  runCreateTarball: () => Promise<TarballFile>): Promise<TarballFile> => {
  for (const executable of executables) {
    console.info('mongosh: signing:', executable);
    await sign(executable, config.appleCodesignIdentity || '', config.appleCodesignEntitlementsFile || '');
  }
  const artifact = await runCreateTarball();
  console.info('mongosh: notarizing and creating tarball:', artifact.path);
  await notarize(
    config.appleNotarizationBundleId || '',
    artifact.path,
    config.appleNotarizationUsername || '',
    config.appleNotarizationApplicationPassword || '');
  return artifact;
};

export default macOSSignAndNotarize;
