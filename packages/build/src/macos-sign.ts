import fs from 'fs';
import util from 'util';
import codesign from 'node-codesign';
import { notarize as nodeNotarize } from 'electron-notarize';
import Config from './config';
import { tarball } from './tarball';

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
const sign = (executable: string, identity: string) => {
  return new Promise((resolve, reject) => {
    codesign({ identity: identity, appPath: executable }, (err, paths) => {
      if (err) {
        reject(err);
      } else {
        resolve(err);
      }
    });
  });
};

const publish = async(executable: string, artifact: string, platform: string, config: Config) => {
  console.log('mongosh: removing unsigned tarball:', artifact);
  await util.promisify(fs.unlink)(artifact);
  console.log('mongosh: signing:', executable);
  await sign(executable, config.appleAppIdentity).
    catch((e) => { console.error(e); throw e; });
  console.log('mongosh: notarizing and creating tarball:', executable);
  await tarball(executable, config.outputDir, platform, config.version, config.rootDir);
  await notarize(
    config.bundleId,
    artifact,
    config.appleUser,
    config.applePassword).catch((e) => { console.error(e); throw e; });
};

export default publish;
