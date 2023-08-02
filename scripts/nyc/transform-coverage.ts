import * as path from 'path';
import * as fs from 'fs';

interface Coverage {
  [filePath: string]: FileCoverage
}

interface FileCoverage {
  path: string;
  inputSourceMap?: InputSourceMap;
  s: unknown;
  b: unknown;
  f: unknown;
}

interface InputSourceMap {
  file: string;
  sources: string[];
}

export function transformCoverageFiles(
	projectRoot: string,
  unifyFileMetadata: 'unify' | 'keep',
  pathTransformer: (path: string) => string
): void {
  const fileMetadata = Object.create(null);
  const nycOutput = path.join(projectRoot, '.nyc_output');

  if (!fs.existsSync(nycOutput)) {
    console.warn('No .nyc_output present...');
    return;
  }

  const coverageFiles = fs.readdirSync(nycOutput, { withFileTypes: true })
    .filter(d => d.isFile() && path.extname(d.name) === '.json')
    .map(d => path.join(nycOutput, d.name));

  console.info(`Processing ${coverageFiles.length} files...`);

  for (const file of coverageFiles) {
    process.stdout.write(`... ${file} `);
    const content = fs.readFileSync(file, { encoding: 'utf-8' });

    const coverage: Coverage = content ? JSON.parse(content) : null;
    if (!coverage || Object.keys(coverage).length === 0) {
      // Just drop/remove empty files.
      fs.unlinkSync(file);
      console.log('-');
      continue;
    }

    for (let p of Object.keys(coverage)) {
      const fileCoverage = coverage[p];
      delete coverage[p];

      p = pathTransformer(p);
      fileCoverage.path = pathTransformer(fileCoverage.path);

      if (fileCoverage.inputSourceMap) {
        const sm = fileCoverage.inputSourceMap;
        sm.file = pathTransformer(sm.file);
        sm.sources = sm.sources.map(pathTransformer);
      }

      if (unifyFileMetadata === 'keep') {
        coverage[p] = fileCoverage;
      } else {
        // When preparing for the final report, we sometimes end up in a situation
        // in which the file metadata from different coverage reports are not exact matches
        // for each other (different source maps, line/column numbers). That leads
        // nyc to generate lower coverage numbers than it otherwise would.
        // TODO(MONGOSH-1551): Investigate why this mismatch occurs (e.g.: some difference
        // between running a package's own tests vs. using a package from another package's
        // tests and then using the transpiled code from lib/ or dist/).
        fileMetadata[p] ??= fileCoverage;
        const { s, b, f } = fileCoverage;
        coverage[p] = {
          ...fileMetadata[p],
          s, b, f
        };
      }
    }
    fs.writeFileSync(file, JSON.stringify(coverage, null, 0), { encoding: 'utf-8' });
    console.log(`*`);
  }

  console.info(`Done!`);
}