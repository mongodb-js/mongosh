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
const notarize = (bundleId: string, artifact: string, user: string, password: string) => {
  return nodeNotarize({
    appBundleId: bundleId,
    appPath: artifact,
    appleId: user,
    appleIdPassword: password
  });
};

/**
 * Signs the executable via codesign.
 *
 * @param {string} executable - The mongosh executable.
 * @param {string} identity - The apple developer identity.
 */
const sign = (executable: string, identity: string, entitlementsFile: string) => {
  return util.promisify(codesign)({
    identity: identity,
    appPath: executable,
    entitlements: entitlementsFile,
  });
};

const macOSSignAndNotarize = async(
  executable: string,
  config: Config,
  runCreateTarball: () => Promise<TarballFile>): Promise<TarballFile> => {
  console.info('mongosh: signing:', executable);
  await sign(executable, config.appleCodesignIdentity, config.appleCodesignEntitlementsFile);
  console.info('mongosh: notarizing and creating tarball:', executable);
  const artifact = await runCreateTarball();
  await notarize(
    config.appleNotarizationBundleId,
    artifact.path,
    config.appleNotarizationUsername,
    config.appleNotarizationApplicationPassword);
  return artifact;
};

export default macOSSignAndNotarize;
