const os = require('os');
const path = require('path');
const { exec } = require('pkg');
const tar = require('tar');
const fs = require('fs');
const config = require(path.join(__dirname, '..', 'packages', 'cli-repl', 'package.json'));

/**
 * Get the name of the executable.
 *
 * @returns {String} The name.
 */
const getExecutable = () => {
  if (os.platform === 'win32') {
    return 'mongosh.exe';
  }
  return 'mongosh';
};

/**
 * Get the target OS.
 *
 * @returns {String} The name.
 */
const getTarget = () => {
  switch (os.platform()) {
    case 'win32': return 'win';
    case 'darwin': return 'macos';
    default: return 'linux';
  }
}

/**
 * Get the path to the executable itself.
 *
 * @returns {String} The path.
 */
const getArtifact = () => {
  return path.join(__dirname, '..', 'dist', getExecutable());
};

/**
 * Creates a tarball of the executable.
 */
const archive = async() => {
  const dirname = path.join(__dirname, '..', 'dist');
  const filename = path.join(dirname, `mongosh-${config.version}-${os.platform}.tgz`);
  console.log('mongosh: archiving:', filename);
  await tar.c(
    {
      gzip: true,
      file: filename,
      cwd: 'dist'
    },
    [getExecutable()]
  );
};

const ANALYTICS_CONFIG_PATH = path.join(__dirname, '..', 'packages', 'cli-repl', 'lib', 'analytics-config.js');

const writeSegmentFile = () => {
  const key = `module.exports = '${process.env.SEGMENT_API_KEY}';`;
  // create directly in cli-repl/lib so it can be part of artifacts in dist
  try {
    // can just write this sync, since it's part of the release script
    fs.writeFileSync(ANALYTICS_CONFIG_PATH, key)
  } catch (e) {
    console.log('mognosh: unable to write segment api key')
    return;
  }
}

/**
 * Creates dist/mongosh or dist/mongosh.exe and then creates a
 * tarball or zip of the executable as dist/mongosh-${version}-${os}.tgz or
 * zip.
 */
const release = async() => {
  const artifact = getArtifact();
  console.log(' -- Writing configuration for segment in', ANALYTICS_CONFIG_PATH);

  writeSegmentFile();

  console.log(' -- DONE: writing configuration for segment.');

  console.log(' -- Content of', path.dirname(ANALYTICS_CONFIG_PATH));

  console.log(fs.readdirSync(path.dirname(ANALYTICS_CONFIG_PATH)));

  console.log('mongosh: creating binary:', artifact);
  await exec([
    path.join(__dirname, '..', 'packages', 'cli-repl', 'bin', 'mongosh.js'),
    '-o',
    artifact,
    '-t',
    getTarget(),
    '--options',
    'experimental-repl-await'
  ]);
  archive();
};

release();
