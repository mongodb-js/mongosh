const YAML = require('yaml');
const fs = require('fs');

/**
 * Imports expansions written to disk to the process env so
 * we don't getting logging of our keys in Evergreen.
 */
const importExpansions = () => {
  const expansionsPath = process.env.EVERGREEN_EXPANSIONS_PATH;

  if (!expansionsPath) {
    return;
  }

  if (!fs.existsSync(expansionsPath)) {
    throw new Error(`importExpansions failed: file ${expansionsPath} not found`);
  }

  const data = fs.readFileSync(expansionsPath, 'utf8');
  const expansions = YAML.parse(data);
  Object.keys(expansions).forEach((key) => {
    process.env[key] = expansions[key];
  });

  console.info('Imported expansions:', Object.keys(expansions));
}

importExpansions();