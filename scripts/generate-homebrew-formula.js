const https = require('https');
const crypto = require('crypto');
const path = require('path');

const { getLatestVersion, gitClone, confirm } = require('./utils');
const { execSync } = require('child_process');
const { writeFileSync, readFileSync } = require('fs');

function httpsSha256(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (stream) => {
      const hash = crypto.createHash('sha256');
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  });
}

function render(context) {
  return `require "language/node"

class Mongosh < Formula
  desc "The MongoDB Shell"

  homepage "https://github.com/mongodb-js/mongosh#readme"
  url "https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${context.version}.tgz"
  version "${context.version}"

  # This is the checksum of the archive. Can be obtained with:
  # curl -s https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${context.version}.tgz | shasum -a 256
  sha256 "${context.sha}"

  depends_on "node@14"

  def install
    system "#{Formula["node@14"].bin}/npm", "install", *Language::Node.std_npm_install_args(libexec)
    (bin/"mongosh").write_env_script libexec/"bin/mongosh", :PATH => "#{Formula["node@14"].opt_bin}:$PATH"
  end

  test do
    system "#{bin}/mongosh --version"
  end
end
`
}

async function generateHomebrewFormula(releaseDirPath, version) {
  const url = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${version}.tgz`;
  const sha = await httpsSha256(url);
  const formula = await render({version, sha});

  console.log(formula);

  if (!await confirm('Do you want to make a PR for the mongodb tap?')) {
    return;
  }

  const cloneDir = path.resolve(releaseDirPath, 'homebrew-brew');

  gitClone(
    'git@github.com:mongodb/homebrew-brew.git',
    cloneDir
  )

  const branchName = `mongosh-${version}-${sha}`;
  execSync(`git checkout -b ${branchName}`, { cwd: cloneDir, stdio: 'inherit' });

  const formulaPath = path.resolve(cloneDir, 'Formula', 'mongosh.rb');

  const currentContent = readFileSync(formulaPath, 'utf-8');

  if (currentContent === formula) {
    console.log('There are no changes to commit.');
    return;
  }

  writeFileSync(
    formulaPath,
    formula
  );

  execSync('git add .', { cwd: cloneDir, stdio: 'inherit' });
  execSync(`git commit -m "mongosh ${version}"`, { cwd: cloneDir, stdio: 'inherit' });
  execSync(`git push origin ${branchName}`, { cwd: cloneDir, stdio: 'inherit' });

  console.info('\n\n', `Create a PR by visiting: https://github.com/mongodb/homebrew-brew/pull/new/${branchName}`);
}

if (require.main === module) {
  const version = getLatestVersion();

  generateHomebrewFormula(
    path.resolve(__dirname, "..", "tmp", "homebrew-brew", `${Date.now()}`),
    version
  );
} else {
  module.exports = generateHomebrewFormula;
}
