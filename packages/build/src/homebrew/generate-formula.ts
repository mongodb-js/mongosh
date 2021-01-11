import { httpsSha256 } from './utils';

export async function generateHomebrewFormula(version: string): Promise<string> {
  const url = `https://registry.npmjs.org/@mongosh/cli-repl/-/cli-repl-${version}.tgz`;
  const sha = await httpsSha256(url);
  return renderFormula({ version, sha });
}

function renderFormula(context: { version: string, sha: string }): string {
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
`;
}
