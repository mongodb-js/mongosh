import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { join } from 'path';

const MANPAGE_URL = 'https://docs.mongodb.com/mongodb-shell/manpages.tar.gz';
const MANPAGE_NAME = 'manpages.tar.gz';

const fetchData = async(): Promise<Buffer> => {
  const response = await fetch(MANPAGE_URL);
  const data = await response.arrayBuffer();
  return Buffer.from(data);
};

export async function downloadManpage(destination: string) {
  const data = await fetchData();
  await fs.writeFile(data, join(destination, MANPAGE_NAME));
  console.info('Manual file saved.');
}
