import { dataFormat } from './helpers';
import { expect } from 'chai';

describe('dataFormat', () => {
  it('formats byte amounts', () => {
    expect(dataFormat()).to.equal('0B');
    expect(dataFormat(10)).to.equal('10B');
    expect(dataFormat(4096)).to.equal('4KiB');
    expect(dataFormat(4096 * 4096)).to.equal('16MiB');
    expect(dataFormat(4096 * 4096 * 4096)).to.equal('64GiB');
    expect(dataFormat(4096 * 4096 * 4096 * 1000)).to.equal('64000GiB');
  });
});
