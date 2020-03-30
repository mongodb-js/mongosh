const os = require('os');
const path = require('path');
const { exec } = require('pkg');
const tar = require('tar');
const config = path.join(__dirname, '..', 'packages', 'cli-repl', 'package.json');

const getFilename = () => {
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

const archive = async() => {
  await tar.c(
    {
      gzip: true,
      file: path.join(__dirname, '..', 'dist', `mongosh-${config.version}-${os.platform}.tgz`)
    },
    [path.join(__dirname, '..', 'dist', getFilename())]
  );
};

const release = async() => {
  await exec([
    path.join(__dirname, '..', 'packages', 'cli-repl', 'bin', 'mongosh.js'),
    '-o',
    path.join(__dirname, '..', 'dist', getFilename()),
    '-t',
    getTarget()
  ]);
  archive();
};

release();
