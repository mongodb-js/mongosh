import { expect } from 'chai';
import { generateFormula } from './generate-formula';


describe('Homebrew generate-formula', () => {
  it('returns the proper formula document', () => {
    const expectedFormula = `require "language/node"

class Mongosh < Formula
  desc "The MongoDB Shell"

  homepage "https://github.com/mongodb-js/mongosh#readme"
  url "https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz"
  version "1.0.0"

  # This is the checksum of the archive. Can be obtained with:
  # curl -s https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-1.0.0.tgz | shasum -a 256
  sha256 "SHAHASH"

  depends_on "node@14"

  def install
    system "#{Formula["node@14"].bin}/npm", "install", *Language::Node.std_npm_install_args(libexec)
    (bin/"mongosh").write_env_script libexec/"bin/mongosh", :PATH => "#{Formula["node@14"].opt_bin}:$PATH"
  end

  test do
    system "#{bin}/mongosh --version"
  end
end
`;
    expect(generateFormula({ version: '1.0.0', sha: 'SHAHASH' })).to.equal(expectedFormula);
  });
});
