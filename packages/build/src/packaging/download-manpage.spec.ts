import nock from 'nock';
import { join } from 'path';
import { promises as fs } from 'fs';
import { downloadManpage } from './download-manpage';

describe('packaging download manpage', function () {
  it('downloads manpage', async function () {
    nock('http://example.com')
      .get('/')
      .replyWithFile(
        200,
        join(__dirname, '..', '..', 'test', 'fixtures', 'manpages.tar.gz')
      );

    const destination = join(__dirname, '..', '..', 'tmp', 'manpage');
    const name = 'foobar.1.gz';
    await downloadManpage('http://example.com', destination, name);
    await fs.access(join(destination, name));
  });
});
