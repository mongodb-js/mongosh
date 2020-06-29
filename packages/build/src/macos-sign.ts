import fs from 'fs';
import util from 'util';
import codesign from 'node-codesign';
import { notarize as nodeNotarize } from 'electron-notarize';
import Config from './config';
import { zip } from './zip';

/**
 * Notarizes the zipped mongosh. Will send the zip to Apple and poll apple
 * for the notarization result.
 *
 * @param {string} bundleId - The bundle id (com.mongodb.mongosh)
 * @param {string} artifact - The path to the zip.
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
  console.log('mongosh: removing unsigned zip:', artifact);
  await util.promisify(fs.unlink)(artifact);
  console.log('mongosh: signing:', executable);
  await sign(executable, config.appleAppIdentity).
    catch((e) => { console.error(e); throw e; });
  console.log('mongosh: notarizing and zipping:', executable);
  await zip(executable, config.outputDir, platform, config.version);
  await notarize(
    config.bundleId,
    artifact,
    config.appleUser,
    config.applePassword).catch((e) => { console.error(e); throw e; });
};

export default publish;
