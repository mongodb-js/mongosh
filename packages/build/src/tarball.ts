import childProcess from 'child_process';
import { constants as fsConstants, promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import tar from 'tar';
import { promisify } from 'util';
import BuildVariant from './build-variant';
// FICLONE means preferring copy-on-write clones if the fs supports it.
const { COPYFILE_FICLONE } = fsConstants;

// Wrap execFile to get some nicer logging for debugging purposes.
const execFileWithoutLogging = promisify(childProcess.execFile);
const execFile = async(...args: Parameters<typeof execFileWithoutLogging>): Promise<ReturnType<typeof execFileWithoutLogging>> => {
  const joinedCommand = [args[0], ...(args[1] ?? [])].join(' ');
  console.info('Running "' + joinedCommand + '" in ' + args[2]?.cwd ?? process.cwd());
  const result = await execFileWithoutLogging(...args);
  console.info('"' + joinedCommand + '" resulted in:', {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString()
  });
  return result;
};

interface DocumentationFile {
  sourceFilePath: string;
  packagedFilePath: string;
}

interface LicenseInformation extends DocumentationFile {
  debIdentifier: string;
  debCopyright: string;
  rpmIdentifier: string;
}

// This is filled in by the build config file.
export interface PackageInformation {
  binaries: {
    sourceFilePath: string;
    category: 'bin' | 'libexec';
    license: LicenseInformation;
  }[];
  otherDocFilePaths: DocumentationFile[];
  metadata: {
    name: string;
    version: string;
    description: string;
    homepage: string;
    maintainer: string;
    manufacturer: string;
    fullName: string;
  };
  debTemplateDir: string;
  rpmTemplateDir: string;
  msiTemplateDir: string;
}

export function getTarballFile(buildVariant: BuildVariant, version: string, name: string): TarballFile {
  switch (buildVariant) {
    case BuildVariant.Linux:
      return {
        path: `${name}-${version}-${buildVariant}.tgz`,
        contentType: 'application/gzip'
      };
    case BuildVariant.Redhat:
      return {
        path: `${name}-${version}-x86_64.rpm`,
        contentType: 'application/x-rpm'
      };
    case BuildVariant.Debian:
      // debian packages are required to be separated by _ and have arch in the
      // name: https://www.debian.org/doc/manuals/debian-faq/pkg-basics.en.html
      // sometimes there is also revision number, but we can add that later.
      return {
        path: `${name}_${version}_amd64.deb`,
        contentType: 'application/vnd.debian.binary-package'
      };
    case BuildVariant.MacOs:
    case BuildVariant.Windows:
      return {
        path: `${name}-${version}-${buildVariant}.zip`,
        contentType: 'application/zip'
      };
    case BuildVariant.WindowsMSI:
      return {
        path: `${name}-${version}.msi`,
        contentType: 'application/x-msi'
      };
    default:
      throw new Error(`Unknown build variant: ${buildVariant}`);
  }
}

/**
 * Create a directory containing the contents of the to-be-generated tarball/zip.
 */
async function createTarballContents(pkg: PackageInformation): Promise<string> {
  // For the tarball and the zip file: We put license and readme texts at the
  // root of the package, and put all binaries into /bin.
  const tmpDir = path.join(__dirname, '..', '..', '..', 'tmp', `pkg-${Date.now()}-${Math.random()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const docFiles = [
    ...pkg.otherDocFilePaths,
    ...pkg.binaries.map(({ license }) => license)
  ];
  for (const { sourceFilePath, packagedFilePath } of docFiles) {
    await fs.copyFile(sourceFilePath, path.join(tmpDir, packagedFilePath), COPYFILE_FICLONE);
  }
  await fs.mkdir(path.join(tmpDir, 'bin'));
  for (const { sourceFilePath } of pkg.binaries) {
    await fs.copyFile(sourceFilePath, path.join(tmpDir, 'bin', path.basename(sourceFilePath)), COPYFILE_FICLONE);
  }
  return tmpDir;
}

/**
 * Create a tarball archive for posix.
 *
 * @param {string} pkg - The source package information.
 * @param {string} filename - the tarball filename.
 */
export const tarballPosix = async(pkg: PackageInformation, filename: string): Promise<void> => {
  const tmpDir = await createTarballContents(pkg);
  await tar.c({
    gzip: true,
    file: filename,
    cwd: tmpDir
  }, await fs.readdir(tmpDir));
  await promisify(rimraf)(tmpDir);
};

/**
 * Create a directory based off another directory whose files may contain
 * template strings of the form {{template}}. If we encounter a template for
 * which we don't know how to replace it, we fail with an error.
 */
async function generateDirFromTemplate(sourceDir: string, interpolations: Record<string, any>): Promise<string> {
  const dir = path.join(__dirname, '..', '..', '..', 'tmp', `pkg-${Date.now()}-${Math.random()}`);
  await copyDirAndApplyTemplates(sourceDir, dir);
  return dir;

  async function copyDirAndApplyTemplates(from: string, to: string): Promise<void> {
    await fs.mkdir(to, { recursive: true });
    for await (const entry of await fs.opendir(from)) {
      const sourceFile = path.join(from, entry.name);
      const targetFile = path.join(to, entry.name);
      if (entry.isDirectory()) {
        await copyDirAndApplyTemplates(sourceFile, targetFile);
      } else {
        const sourceText = await fs.readFile(sourceFile, 'utf8');
        const interpolatedText = sourceText.replace(
          /\{\{(\w+)\}\}/g,
          (_match, identifier) => {
            if (!(identifier in interpolations)) {
              throw new Error(`Need ${identifier} for replacement in ${sourceFile}`);
            }
            return interpolations[identifier];
          });
        await fs.writeFile(targetFile, interpolatedText);
      }
    }
  }
}

async function estimatePackageSize(pkg: PackageInformation) {
  let size = 0;
  for (const { sourceFilePath } of pkg.binaries) {
    size += (await fs.stat(sourceFilePath)).size;
  }
  return size;
}

function sanitizeVersion(version: string, variant: 'rpm' | 'msi'): string {
  const rpmVersion = version.replace(/[-]/g, '.'); // Needed to create a valid rpm.
  if (variant === 'rpm') return rpmVersion;
  return rpmVersion.split('.').slice(0, 3).join('.');
}

async function generateDebianCopyright(pkg: PackageInformation): Promise<string> {
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
    licenses[license.debIdentifier] = await fs.readFile(license.sourceFilePath, 'utf8');
  }

  for (const [identifier, sourceText] of Object.entries(licenses)) {
    text += `License: ${identifier}\n` + sourceText.replace(/^/mg, ' ') + '\n';
  }
  return text;
}

/**
 * Create a deb archive.
 *
 * @param {string} pkg - The source package information.
 * @param {string} templateDir - A directory with templates for the package.
 * @param {string} filename - the tarball filename.
 */
export const tarballDebian = async(pkg: PackageInformation, templateDir: string, filename: string): Promise<void> => {
  console.info('mongosh: writing deb package');
  const size = await estimatePackageSize(pkg);
  const dir = await generateDirFromTemplate(templateDir, {
    ...pkg.metadata,
    size
  });
  const docFiles = [
    ...pkg.otherDocFilePaths,
    ...pkg.binaries.map(({ license }) => license)
  ];
  // Put documentation files in /usr/share/doc/.
  const docdir = path.join(dir, pkg.metadata.name, 'usr', 'share', 'doc', pkg.metadata.name);
  await fs.mkdir(docdir, { recursive: true });
  for (const { sourceFilePath, packagedFilePath } of docFiles) {
    await fs.copyFile(sourceFilePath, path.join(docdir, packagedFilePath), COPYFILE_FICLONE);
  }
  // Debian packages should contain a 'copyright' file.
  // https://www.debian.org/doc/debian-policy/ch-archive.html#s-pkgcopyright
  await fs.writeFile(path.join(docdir, 'copyright'), await generateDebianCopyright(pkg));
  for (const { sourceFilePath, category } of pkg.binaries) {
    const targetDir = path.join(dir, pkg.metadata.name, 'usr', category);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(sourceFilePath, path.join(targetDir, path.basename(sourceFilePath)), COPYFILE_FICLONE);
  }
  if (!process.env.MONGOSH_TEST_NO_DPKG) {
    // Create the package.
    await execFile('dpkg', [
      '--build', path.join(dir, pkg.metadata.name)
    ], {
      cwd: path.dirname(dir)
    });
    await fs.rename(path.join(dir, `${pkg.metadata.name}.deb`), filename);
  }
  await promisify(rimraf)(dir);
};

/**
 * Create a rpm archive.
 *
 * @param {string} pkg - The source package information.
 * @param {string} templateDir - A directory with templates for the package.
 * @param {string} filename - the tarball filename.
 */
export const tarballRedhat = async(pkg: PackageInformation, templateDir: string, filename: string): Promise<void> => {
  console.info('mongosh: writing rpm package');
  // Generate a license string like 'ASL-2 and Proprietary' to indicate that
  // this package contains both Apache-2.0 and non-free software.
  // https://fedoraproject.org/wiki/Packaging:LicensingGuidelines#Multiple_Licensing_Scenarios
  const licenseRpm = pkg.binaries.map(({ license }) => license.rpmIdentifier).join(' and ');
  // Put the binaries in their expected locations.
  const installscriptRpm = pkg.binaries.map(({ sourceFilePath, category }) =>
    `mkdir -p %{buildroot}/%{_${category}dir}\n` +
        `install -m 755 ${path.basename(sourceFilePath)} %{buildroot}/%{_${category}dir}/${path.basename(sourceFilePath)}`)
    .join('\n');
  // Add binaries to the package, and list license and other documentation files.
  // rpm will automatically put license and doc files in the directories where
  // it thinks they should go.
  // http://ftp.rpm.org/max-rpm/s1-rpm-inside-files-list-directives.html
  const filelistRpm = [
    ...pkg.binaries.map(({ sourceFilePath, category }) => `%{_${category}dir}/${path.basename(sourceFilePath)}`),
    ...pkg.binaries.map(({ license }) => `%license ${license.packagedFilePath}`),
    ...pkg.otherDocFilePaths.map(({ packagedFilePath }) => `%doc ${packagedFilePath}`)
  ].join('\n');
  const version = sanitizeVersion(pkg.metadata.version, 'rpm');
  const dir = await generateDirFromTemplate(templateDir, {
    ...pkg.metadata,
    licenseRpm,
    installscriptRpm,
    filelistRpm,
    version
  });
  // Copy all files that we want to ship into the BUILD directory.
  for (const { sourceFilePath } of pkg.binaries) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', path.basename(sourceFilePath)), COPYFILE_FICLONE);
  }
  for (const { sourceFilePath, packagedFilePath } of pkg.binaries.map(({ license }) => license)) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', packagedFilePath), COPYFILE_FICLONE);
  }
  for (const { sourceFilePath, packagedFilePath } of pkg.otherDocFilePaths) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', packagedFilePath), COPYFILE_FICLONE);
  }

  // Create the package.
  const arch = 'x86_64';
  if (!process.env.MONGOSH_TEST_NO_RPMBUILD) {
    await execFile('rpmbuild', [
      '-bb', path.join(dir, 'SPECS', `${pkg.metadata.name}.spec`),
      '--target', arch,
      '--define', `_topdir ${dir}`
    ], {
      cwd: path.dirname(dir)
    });
    const rpmdir = path.join(dir, 'RPMS', arch);
    const rpmnames = (await fs.readdir(rpmdir)).filter(name => name.endsWith('.rpm'));
    if (rpmnames.length !== 1) {
      throw new Error(`Don’t know which RPM from ${rpmdir} to pick: ${rpmnames}`);
    }
    await fs.rename(path.join(rpmdir, rpmnames[0]), filename);
  }
  await promisify(rimraf)(dir);
};

/**
 * Create an msi installer.
 *
 * @param {string} pkg - The source package information.
 * @param {string} templateDir - A directory with templates for the package.
 * @param {string} filename - the tarball filename.
 */
export const tarballWindowsMSI = async(pkg: PackageInformation, templateDir: string, filename: string): Promise<void> => {
  console.info('mongosh: writing msi package');

  const filenames = [...new Set([
    ...pkg.binaries.map(({ sourceFilePath }) => path.basename(sourceFilePath)),
    ...pkg.binaries.map(({ license }) => license.packagedFilePath),
    ...pkg.otherDocFilePaths.map(({ packagedFilePath }) => packagedFilePath)
  ])];
  const msiComponentList =
    filenames.map(f => `<Component><File Source="$(var.BuildFolder)\\${f}"/></Component>`).join('\n');
  const version = sanitizeVersion(pkg.metadata.version, 'msi');

  const dir = await generateDirFromTemplate(templateDir, {
    ...pkg.metadata,
    msiComponentList,
    version
  });

  // Copy all files that we want to ship into the BUILD directory.
  for (const { sourceFilePath } of pkg.binaries) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', path.basename(sourceFilePath)), COPYFILE_FICLONE);
  }
  for (const { sourceFilePath, packagedFilePath } of pkg.binaries.map(({ license }) => license)) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', packagedFilePath), COPYFILE_FICLONE);
  }
  for (const { sourceFilePath, packagedFilePath } of pkg.otherDocFilePaths) {
    await fs.copyFile(sourceFilePath, path.join(dir, 'BUILD', packagedFilePath), COPYFILE_FICLONE);
  }

  if (!process.env.MONGOSH_TEST_NO_MSIBUILD) {
    const WIX = process.env.WIX;
    await execFile(`${WIX}\\bin\\candle.exe`, [
      '-out', 'obj\\Release\\',
      '-arch', 'x64',
      '-ext', `${WIX}\\bin\\WixUIExtension.dll`,
      'MongoshUI.wxs', 'Product.wxs'
    ], {
      cwd: dir
    });
    await execFile(`${WIX}\\bin\\light.exe`, [
      '-out', `bin\\Release\\${path.basename(filename)}`,
      '-cultures:en-US',
      '-ext', `${WIX}\\bin\\WixUIExtension.dll`,
      '-loc', 'MongoshUI.en-US.wxl',
      'obj\\Release\\MongoshUI.wixobj',
      'obj\\Release\\Product.wixobj'
    ], {
      cwd: dir
    });
    await fs.rename(path.join(dir, 'bin', 'Release', path.basename(filename)), filename);
  }
  await promisify(rimraf)(dir);
};

/**
 * Create a tarball archive for windows.
 *
 * @param pkg - Package information
 * @param filename - the tarball filename.
 */
export const tarballWindows = async(pkg: PackageInformation, filename: string): Promise<void> => {
  // Let's assume that either zip or 7z are installed. That's true for the
  // evergreen macOS and Windows machines, respectively, at this point.
  // In either case, using these has the advantage of preserving executable permissions
  // as opposed to using libraries like adm-zip.
  const tmpDir = await createTarballContents(pkg);
  try {
    await execFile('zip', ['-r', filename, '.'], { cwd: tmpDir });
  } catch (err) {
    if (err.code === 'ENOENT') {
      await execFile('7z', ['a', filename, '.'], { cwd: tmpDir });
    } else {
      throw err;
    }
  }
  await promisify(rimraf)(tmpDir);
};

export type TarballFile = { path: string; contentType: string };

/**
 * Create a gzipped tarball or zip for the provided options.
 *
 * @param outputDir - Where to save the tarball.
 * @param buildVariant - The build variant.
 * @param packageInformation - Additional package information.
 * @returns The path and type of the tarball.
 */
export async function createTarball(
  outputDir: string,
  buildVariant: BuildVariant,
  packageInformation: PackageInformation
): Promise<TarballFile> {
  const tarballFile = getTarballFile(buildVariant, packageInformation.metadata.version, packageInformation.metadata.name);
  const fullTarballFilePath = path.join(outputDir, tarballFile.path);
  console.info('mongosh: gzipping:', fullTarballFilePath);

  switch (buildVariant) {
    case BuildVariant.Linux:
      await tarballPosix(packageInformation, fullTarballFilePath);
      break;
    case BuildVariant.Redhat:
      await tarballRedhat(packageInformation, packageInformation.rpmTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.Debian:
      await tarballDebian(packageInformation, packageInformation.debTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.WindowsMSI:
      await tarballWindowsMSI(packageInformation, packageInformation.msiTemplateDir, fullTarballFilePath);
      break;
    case BuildVariant.MacOs:
    case BuildVariant.Windows:
      await tarballWindows(packageInformation, fullTarballFilePath);
      break;
    default:
      throw new Error(`Unhandled build variant: ${buildVariant}`);
  }

  return {
    ...tarballFile,
    path: fullTarballFilePath
  };
}
