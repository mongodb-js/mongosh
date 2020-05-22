import fs from 'fs/promises';
import codesign from 'node-codesign';
import { notarize as nodeNotarize } from 'electron-notarize';
import Config from './config';

const notarize = (bundleId: string, executable: string, user: string, password: string) => {
  return nodeNotarize({
    appBundleId: bundleId,
    appPath: executable,
    appleId: user,
    appleIdPassword: password
  });
};

const sign = (path: string, identity: string) => {
  return new Promise((resolve, reject) => {
    codesign({ identity: identity, appPath: path }, (err, paths) => {
      if (err) {
        reject(err);
      } else {
        resolve(err);
      }
    });
  });
};

const publish = async(executable: string, artifact: string, config: Config) => {
  // Remove the zip that was created since the notarize process will create a
  // new zip.
  await fs.unlink(artifact);
  await sign(config.outputDir, config.appleAppIdentity);
  await notarize(config.bundleId, executable, config.appleUser, config.applePassword);
};

export default publish;
