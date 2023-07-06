import { constants, promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import {
  execFile as execFileFn,
  generateDirFromTemplate,
  getManSection,
} from './helpers';
import type { PackageInformation } from './package-information';
import type { Arch } from '../../config';
import { getDebArchName } from '../../config';

const { COPYFILE_FICLONE } = constants;

/**
 * Create a deb archive.
 */
export async function createDebianPackage(
  pkg: PackageInformation,
  templateDir: string,
  arch: Arch,
  outFile: string,
  execFile: typeof execFileFn = execFileFn
): Promise<void> {
  console.info('mongosh: writing deb package');
  const size = await estimatePackageSizeKb(pkg);
  const dir = await generateDirFromTemplate(templateDir, {
    ...pkg.metadata,
    size,
    debianArch: getDebArchName(arch),
    provides: pkg.metadata.provides
      .map(({ name, version }) => `${name} (= ${version})`)
      .join(', '),
  });

  // dpkg wants the package data to be in a directory with the same name as the package
  await fs.mkdir(path.join(dir, pkg.metadata.debName), { recursive: true });
  for (const templateDirEntry of await fs.readdir(dir)) {
    if (templateDirEntry === pkg.metadata.debName) continue;
    await fs.rename(
      path.join(dir, templateDirEntry),
      path.join(dir, pkg.metadata.debName, templateDirEntry)
    );
  }

  const docFiles = [
    ...pkg.otherDocFilePaths,
    ...pkg.binaries.map(({ license }) => license),
  ];
  // Put documentation files in /usr/share/doc/.
  const docdir = path.join(
    dir,
    pkg.metadata.debName,
    'usr',
    'share',
    'doc',
    pkg.metadata.debName
  );
  await fs.mkdir(docdir, { recursive: true });
  for (const { sourceFilePath, packagedFilePath } of docFiles) {
    await fs.copyFile(
      sourceFilePath,
      path.join(docdir, packagedFilePath),
      COPYFILE_FICLONE
    );
  }

  if (pkg.manpage) {
    // Put manpage file in /usr/share/man/man1/.
    const manualDir = path.join(
      dir,
      pkg.metadata.debName,
      'usr',
      'share',
      'man',
      'man' + getManSection(pkg.manpage.packagedFilePath)
    );
    await fs.mkdir(manualDir, { recursive: true });
    await fs.copyFile(
      pkg.manpage.sourceFilePath,
      path.join(manualDir, pkg.manpage.packagedFilePath),
      COPYFILE_FICLONE
    );
  }

  // Debian packages should contain a 'copyright' file.
  // https://www.debian.org/doc/debian-policy/ch-archive.html#s-pkgcopyright
  await fs.writeFile(
    path.join(docdir, 'copyright'),
    await generateDebianCopyright(pkg)
  );
  for (const { sourceFilePath, category } of pkg.binaries) {
    const targetDir = path.join(dir, pkg.metadata.debName, 'usr', category);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(
      sourceFilePath,
      path.join(targetDir, path.basename(sourceFilePath)),
      COPYFILE_FICLONE
    );
  }

  // Create the package.
  await execFile('dpkg', ['--build', path.join(dir, pkg.metadata.debName)], {
    cwd: path.dirname(dir),
  });

  await fs.rename(path.join(dir, `${pkg.metadata.debName}.deb`), outFile);

  await promisify(rimraf)(dir);
}

async function estimatePackageSizeKb(pkg: PackageInformation) {
  let size = 0;
  for (const { sourceFilePath } of pkg.binaries) {
    size += (await fs.stat(sourceFilePath)).size;
  }
  return Math.ceil(size / 1024);
}

async function generateDebianCopyright(
  pkg: PackageInformation
): Promise<string> {
  // This is a machine-readable licensing format used for Debian packages:
  // https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
  let text = `\
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Contact: ${pkg.metadata.maintainer}
Source: ${pkg.metadata.homepage}

`;
  const licenses: Record<string, string> = {};
  for (const { license, category, sourceFilePath } of pkg.binaries) {
    text += `\
Files: /usr/${category}/${path.basename(sourceFilePath)}
Copyright: ${license.debCopyright}
License: ${license.debIdentifier}

`;
    licenses[license.debIdentifier] = await fs.readFile(
      license.sourceFilePath,
      'utf8'
    );
  }

  for (const [identifier, sourceText] of Object.entries(licenses)) {
    text += `License: ${identifier}\n` + sourceText.replace(/^/gm, ' ') + '\n';
  }
  return text;
}
