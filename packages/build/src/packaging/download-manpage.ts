import fetch from 'node-fetch';
import tar from 'tar';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import { pipeline } from 'stream';
import { execFile } from './package/helpers';

export async function downloadManpage(url: string, destination: string, name: string) {
  await fs.mkdir(destination, { recursive: true });
  const response = await fetch(url);
  await promisify(pipeline)(
    response.body,
    tar.x({ cwd: destination })
  );
  await execFile('zip', ['-r', name, '.'], { cwd: destination });
  console.info(`Saved manpage: ${join(destination, name)}`);
}
