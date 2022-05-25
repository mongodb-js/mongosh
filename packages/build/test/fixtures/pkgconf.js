const path = require('path');

module.exports = {
  binaries: [
    {
      sourceFilePath: path.resolve(__dirname, 'bin', 'foo'),
      category: 'bin',
      license: {
        debIdentifier: 'Banana',
        debCopyright: '2021 My Cats',
        rpmIdentifier: 'Banana',
        sourceFilePath: path.resolve(__dirname, 'LICENSE-foo'),
        packagedFilePath: 'LICENSE_foo'
      }
    },
    {
      sourceFilePath: path.resolve(__dirname, 'bin', 'bar'),
      category: 'lib',
      license: {
        debIdentifier: 'Apple',
        debCopyright: '2021 Somebody Else’s Cats',
        rpmIdentifier: 'Apple',
        sourceFilePath: path.resolve(__dirname, 'LICENSE-bar'),
        packagedFilePath: 'LICENSE_bar'
      }
    }
  ],
  otherDocFilePaths: [
    {
      sourceFilePath: path.resolve(__dirname, 'README'),
      packagedFilePath: 'README'
    },
  ],
  manpage: {
    sourceFilePath: path.resolve(__dirname, 'manpages.tar.gz'),
    packagedFilePath: 'foobar.1.gz'
  },
  metadata: {
    version: '1.0.0',
    fullName: 'Very dumb dummy package',
    description: 'Dummy package',
    homepage: 'https://example.org',
    maintainer: 'Somebody <somebody@example.org>',
    name: 'foobar',
    debName: 'foobar',
    provides: [],
    rpmName: 'foobar',
    manufacturer: 'Some Random Company Inc.'
  },
  debTemplateDir: path.resolve(__dirname, 'deb-template'),
  rpmTemplateDir: path.resolve(__dirname, 'rpm-template'),
  msiTemplateDir: path.resolve(__dirname, 'msi-template')
};
