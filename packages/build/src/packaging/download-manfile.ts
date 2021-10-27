import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { join } from 'path';
import { manpage as config } from './../config';

const fetchData = async(): Promise<Buffer> => {
  const response = await fetch(config.downloadUrl);
  const data = await response.arrayBuffer();
  return Buffer.from(data);
};

export async function downloadManpage(destination: string) {
  const data = await fetchData();
  await fs.writeFile(join(destination, config.fileName), data);
  console.info('Manual file saved.');
}
