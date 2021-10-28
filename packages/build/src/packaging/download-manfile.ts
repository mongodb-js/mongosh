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

  const manFilePath = join(destination, name);
  await fs.writeFile(manFilePath, data);

  await tar.x({ file: manFilePath, cwd: destination });

  await tar.c({
    gzip: true,
    file: manFilePath,
  }, [join(destination, 'mongosh.1')]);

  console.info('Manual file saved.');
}
