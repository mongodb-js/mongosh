import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { join } from 'path';

const MAN_URL = 'https://docs.mongodb.com/mongodb-shell/manpages.tar.gz';
const MAN_FILE_NAME = 'manpages.tar.gz';

const fetchData = async (): Promise<Buffer> => {
  const response = await fetch(MAN_URL);
  const data = await response.arrayBuffer();
  return Buffer.from(data);
}

const writeDataToFile = (data: Buffer, file: string): void => {
  writeFileSync(file, data);
}

(async () => {
  try {
    const data = await fetchData();
    const file = join(__dirname, '..', MAN_FILE_NAME);
    writeDataToFile(data, file);
    console.log('Manual file saved.');
  } catch (e) {
    console.error(`Failed to write manual file. Error: ${e}`);
  }
})();