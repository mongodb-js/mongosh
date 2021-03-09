import childProcess from 'child_process';
import { promises as fs, constants } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PackageInformation } from './package-information';

const { COPYFILE_FICLONE } = constants;
const execFileWithoutLogging = promisify(childProcess.execFile);

// Wrap execFile to get some nicer logging for debugging purposes.
export async function execFile(...args: Parameters<typeof execFileWithoutLogging>): Promise<ReturnType<typeof execFileWithoutLogging>> {
  const joinedCommand = [args[0], ...(args[1] ?? [])].join(' ');
  console.info('Running "' + joinedCommand + '" in ' + args[2]?.cwd ?? process.cwd());
  const result = await execFileWithoutLogging(...args);
  console.info('"' + joinedCommand + '" resulted in:', {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString()
  });
  return result;
}

/**
 * Create a directory containing the contents of the to-be-generated tarball/zip.
 */
export async function createCompressedArchiveContents(pkg: PackageInformation): Promise<string> {
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
 * Create a directory based off another directory whose files may contain
 * template strings of the form {{template}}. If we encounter a template for
 * which we don't know how to replace it, we fail with an error.
 */
export async function generateDirFromTemplate(sourceDir: string, interpolations: Record<string, any>): Promise<string> {
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

export function sanitizeVersion(version: string, variant: 'rpm' | 'msi'): string {
  const rpmVersion = version.replace(/[-]/g, '.'); // Needed to create a valid rpm.
  if (variant === 'rpm') return rpmVersion;
  return rpmVersion.split('.').slice(0, 3).join('.');
}
