import { constants, promises as fs } from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { execFile as execFileFn, generateDirFromTemplate, sanitizeVersion } from './helpers';
import { PackageInformation } from './package-information';
import { Arch, getRPMArchName } from '../../config';

const { COPYFILE_FICLONE } = constants;

/**
 * Creates an RPM archive.
 */
export async function createRedhatPackage(
  pkg: PackageInformation,
  templateDir: string,
  arch: Arch,
  filename: string,
  execFile: typeof execFileFn = execFileFn
): Promise<void> {
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
  await execFile('rpmbuild', [
    '-bb', path.join(dir, 'SPECS', `${pkg.metadata.rpmName}.spec`),
    '--target', getRPMArchName(arch),
    '--define', `_topdir ${dir}`
  ], {
    cwd: path.dirname(dir)
  });

  const rpmdir = path.join(dir, 'RPMS', getRPMArchName(arch));
  const rpmnames = (await fs.readdir(rpmdir)).filter(name => name.endsWith('.rpm'));
  if (rpmnames.length !== 1) {
    throw new Error(`Don’t know which RPM from ${rpmdir} to pick: ${rpmnames}`);
  }
  await fs.rename(path.join(rpmdir, rpmnames[0]), filename);
  await promisify(rimraf)(dir);
}
