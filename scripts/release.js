const os = require('os');
const path = require('path');
const { exec } = require('pkg');
const tar = require('tar');
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

const writeSegmentFile = async() => {
  const key = `export SEGMENT_API_KEY = ${process.env.SEGMENT_API_KEY}`;
  try {
    // create directly in cli-repl/lib so it can be part of artifacts in dist
    return await fs.writeFile(path.join(__dirname, '..', 'packages', 'cli-repl', 'lib', 'config.js'));
  } catch (e) {
    console.log('mongosh: unable to write segment config file');
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
  const segmentFile = await writeSegmentFile();
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
