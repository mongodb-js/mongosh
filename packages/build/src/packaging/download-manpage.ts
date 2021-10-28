import fetch from 'node-fetch';
import tar from 'tar';
import { promises as fs } from 'fs';
import { join } from 'path';

const fetchData = async(url: string): Promise<Buffer> => {
  const response = await fetch(url);
  const data = await response.arrayBuffer();
  return Buffer.from(data);
};

export async function downloadManpage(url: string, destination: string, name: string) {
  const data = await fetchData(url);

  const manPagePath = join(destination, name);
  await fs.writeFile(manPagePath, data);

  await tar.x({ file: manPagePath, cwd: destination });

  await tar.c({
    gzip: true,
    file: manPagePath,
  }, [join(destination, 'mongosh.1')]);

  console.info('Manual page saved.');
}
