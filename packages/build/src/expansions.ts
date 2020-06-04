import YAML from 'yaml';
import fs from 'fs';
import util from 'util';

/**
 * Imports expansions written to disk to the process env so
 * we don't getting logging of our keys in Evergreen.
 */
const importExpansions = async(path: string) => {
  const data = await util.promisify(fs.readFile)(path, 'utf8');
  const expansions = YAML.parse(data);
  console.log('expansions:', expansions);
  Object.keys(expansions).forEach((key) => {
    process.env[key] = expansions[key];
  });
}

export default importExpansions;
