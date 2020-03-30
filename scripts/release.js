const os = require('os');
const path = require('path');
const { exec } = require('pkg');
const config = path.join(__dirname, '..', 'package.json');

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

const release = async() => {
  await exec([
    path.join(__dirname, '..', 'packages', 'cli-repl', 'bin', 'mongosh.js'),
    '-o',
    path.join(__dirname, '..', 'dist', getFilename()),
    '-t',
    getTarget()
  ]);
};

release();
