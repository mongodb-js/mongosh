import fetch from 'node-fetch';
import tar from 'tar';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { promisify } from 'util';
import { join, basename } from 'path';
import { pipeline } from 'stream';
import { createGzip } from 'zlib';

export async function downloadManpage(
  url: string,
  destination: string,
  name: string
) {
  await fs.mkdir(destination, { recursive: true });
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Unexpected response while fetching ${url}`);
  }
  await promisify(pipeline)(response.body, tar.x({ cwd: destination }));
  await promisify(pipeline)(
    createReadStream(join(destination, basename(name, '.gz'))),
    createGzip(),
    createWriteStream(join(destination, name))
  );
  console.info(`Saved manpage: ${join(destination, name)}`);
}
