import * as path from 'path';
import * as fs from 'fs';

interface Coverage {
  [filePath: string]: FileCoverage
}

interface FileCoverage {
  path: string;
  inputSourceMap?: InputSourceMap;
}

interface InputSourceMap {
  file: string;
  sources: string[];
}

export function transformCoverageFiles(
	projectRoot: string,
  pathTransformer: (path: string) => string
): void {
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
    if (!content) {
      console.log('+');
      continue;
    }

    const coverage: Coverage = JSON.parse(content);
    Object.keys(coverage).forEach(p => {
      const fileCoverage = coverage[p];
      delete coverage[p];

      p = pathTransformer(p);
      fileCoverage.path = pathTransformer(fileCoverage.path);

      if (fileCoverage.inputSourceMap) {
        const sm = fileCoverage.inputSourceMap;
        sm.file = pathTransformer(sm.file);
        sm.sources = sm.sources.map(pathTransformer);
      }

      coverage[p] = fileCoverage;
    });
    fs.writeFileSync(file, JSON.stringify(coverage, null, 0), { encoding: 'utf-8' });
    console.log(`*`);
  }

  console.info(`Done!`);
}