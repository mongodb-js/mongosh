const os = require('os');
const path = require('path');
const { exec } = require('pkg');
const tar = require('tar');
const config = require(path.join(__dirname, '..', 'packages', 'cli-repl', 'package.json'));

const getExecutable = () => {
  if (os.platform === 'win32') {
    return 'mongosh.exe';
  }
  return 'mongosh';
};

const getTarget = () => {
  switch (os.platform()) {
    case 'win32': return 'win';
    case 'darwin': return 'macos';
    default: return 'linux';
  }
}

const getArtifact = () => {
  return path.join(__dirname, '..', 'dist', getExecutable());
};

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

const release = async() => {
  const artifact = getArtifact();
  console.log('mongosh: creating binary:', artifact);
  await exec([
    path.join(__dirname, '..', 'packages', 'cli-repl', 'bin', 'mongosh.js'),
    '-o',
    artifact,
    '-t',
    getTarget()
  ]);
  archive();
};

release();
