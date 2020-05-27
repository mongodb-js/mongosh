import crypto from 'crypto';
import axios from 'axios';
import handlebars from 'handlebars';

/**
 * The main package url.
 */
const URL = 'https://registry.npmjs.org/@mongosh/cli-repl';

/**
 * The homebrew formula template.
 */
const TEMPLATE = `
require "language/node"

class Mongosh < Formula
  desc "The MongoDB Shell"
  homepage "https://github.com/mongodb-js/mongosh#readme"
  url "{{tarball}}"
  version "{{version}}"
  sha256 "{{sha}}"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "#{bin}/mongosh --version"
  end
end`;

const getNpmMetadata = async() => {
  const { data } = await axios.get(URL);
  return data;
};

const getSha256 = async(sha: string, tarball: string) => {
  return new Promise(async(resolve, reject) => {
    if (sha.length === 64) {
      resolve(sha);
    } else {
      const hash = crypto.createHash('sha256');
      const { data } = await axios.get(tarball);
      console.log(data);

      data.on('readable', () => {
        const input = data.read();
        if (input) {
          hash.update(input);
        }
      });

      data.on('end', () => {
        resolve(hash.digest('hex'));
      });

      data.on('error', reject);
    }
  });
};

const generateFormula = async() => {
  const data = await getNpmMetadata();
  const template = handlebars.compile(TEMPLATE);
  const version = data['dist-tags'].latest;
  const tarball = data.versions[version].dist.tarball;
  const sha = data.versions[version].dist.shasum;
  const rendered = template({
    tarball: tarball,
    version: version,
    sha: await getSha256(sha, tarball)
  });
  console.log('mongosh: created homebrew template:', rendered);
  return rendered;
};
