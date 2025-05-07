import childProcess from 'child_process';
import { promises as fs, constants } from 'fs';
import path from 'path';
import { promisify } from 'util';
import type { PackageInformation } from './package-information';

const { COPYFILE_FICLONE } = constants;
const execFileWithoutLogging = promisify(childProcess.execFile);

// Wrap execFile to get some nicer logging for debugging purposes.
export async function execFile(
  ...args: Parameters<typeof execFileWithoutLogging>
): Promise<ReturnType<typeof execFileWithoutLogging>> {
  const joinedCommand = [args[0], ...(args[1] ?? [])].join(' ');
  console.info(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TS2869 Right operand of ?? is unreachable because the left operand is never nullish.
    `Running "${joinedCommand}" in ${args[2]?.cwd ?? process.cwd()}`
  );
  const result = await execFileWithoutLogging(...args);
  console.info('"' + joinedCommand + '" resulted in:', {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  });
  return result;
}

/**
 * Create a directory containing the contents of the to-be-generated tarball/zip.
 *
 * The tarball/zip will contain a top-level folder that will then contain all files instead of
 * have all files directly in the archive.
 */
export async function createCompressedArchiveContents(
  archiveRootName: string,
  pkg: PackageInformation
): Promise<string> {
  // For the tarball and the zip file:
  // - We add a single top-level folder to contain all contents
  // - We put license and readme texts directly in the top-level folder, and put all binaries into folder/bin.
  const tmpDir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'tmp',
    `pkg-${Date.now()}-${Math.random()}`
  );
  const archiveRoot = path.join(tmpDir, archiveRootName);
  await fs.mkdir(archiveRoot, { recursive: true });
  const docFiles = [
    ...pkg.otherDocFilePaths,
    ...pkg.binaries.map(({ license }) => license),
  ];
  if (pkg.manpage) {
    docFiles.push(pkg.manpage);
  }

  for (const { sourceFilePath, packagedFilePath } of docFiles) {
    await fs.copyFile(
      sourceFilePath,
      path.join(archiveRoot, packagedFilePath),
      COPYFILE_FICLONE
    );
  }
  await fs.mkdir(path.join(archiveRoot, 'bin'));
  for (const { sourceFilePath } of pkg.binaries) {
    await fs.copyFile(
      sourceFilePath,
      path.join(archiveRoot, 'bin', path.basename(sourceFilePath)),
      COPYFILE_FICLONE
    );
  }
  return tmpDir;
}

/**
 * Create a directory based off another directory whose files may contain
 * template strings of the form {{template}}. If we encounter a template for
 * which we don't know how to replace it, we fail with an error.
 */
export async function generateDirFromTemplate(
  sourceDir: string,
  interpolations: Record<string, any>
): Promise<string> {
  const dir = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'tmp',
    `pkg-${Date.now()}-${Math.random()}`
  );
  await copyDirAndApplyTemplates(sourceDir, dir);
  return dir;

  async function copyDirAndApplyTemplates(
    from: string,
    to: string
  ): Promise<void> {
    await fs.mkdir(to, { recursive: true });
    for await (const entry of await fs.opendir(from)) {
      const sourceFile = path.join(from, entry.name);
      const targetFile = path.join(to, entry.name);
      if (entry.isDirectory()) {
        await copyDirAndApplyTemplates(sourceFile, targetFile);
      } else {
        const sourceText = await fs.readFile(sourceFile, 'utf8');
        if (!sourceText.includes('\ufffd')) {
          // This is valid UTF-8, i.e. a text file
          const interpolatedText = sourceText.replace(
            /\{\{(\w+)\}\}/g,
            (_match, identifier) => {
              if (!(identifier in interpolations)) {
                throw new Error(
                  `Need ${identifier} for replacement in ${sourceFile}`
                );
              }
              return interpolations[identifier];
            }
          );
          await fs.writeFile(targetFile, interpolatedText);
        } else {
          await fs.copyFile(sourceFile, targetFile);
        }
      }
    }
  }
}

export function sanitizeVersion(
  version: string,
  variant: 'rpm' | 'msi'
): string {
  const rpmVersion = version.replace(/[-]/g, '.'); // Needed to create a valid rpm.
  if (variant === 'rpm') return rpmVersion;
  return rpmVersion.split('.').slice(0, 3).join('.');
}

/// Transforms e.g. 'mongosh.1.gz' -> '1'
export function getManSection(filename: string): string {
  const { section } =
    /^.+\.(?<section>\d+)(?:\.gz)?$/.exec(filename)?.groups ?? {};
  if (!section) {
    throw new Error(`Invalid man page name: ${filename}`);
  }
  return section;
}
