const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

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

  depends_on "node@12"

  def install
    system "#{Formula["node@12"].bin}/npm", "install", *Language::Node.std_npm_install_args(libexec)
    (bin/"mongosh").write_env_script libexec/"bin/mongosh", :PATH => "#{Formula["node@12"].opt_bin}:$PATH"
  end

  test do
    system "#{bin}/mongosh --version"
  end
end
`
}

function getLatestVersion() {
  return execSync(`npm view @mongosh/cli-repl .dist-tags.latest`).toString().trim();
}

async function main() {
  const version = getLatestVersion();
  const url = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${version}.tgz`;
  const sha = await httpsSha256(url);
  const formula = await render({version, sha})
  console.log(formula);
}

main();