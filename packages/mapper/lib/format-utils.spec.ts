import { expect } from 'chai';
import { formatBytes, formatTable } from './format-utils';

describe('formatBytes', () => {
  it('formats 1000 as KBs', () => {
    expect(formatBytes(1000)).to.equal('1 kB');
  });

  it('formats 500000000 as MBs', () => {
    expect(formatBytes(500000000)).to.equal('500 MB');
  });

  it('formats 5000000000 as GBs', () => {
    expect(formatBytes(5000000000)).to.equal('5 GB');
  });
});

describe('formatTable', () => {
  it('formats entries as table', () => {
    expect(formatTable([
      ['a', '1'],
      ['columnwithlotoftext', '2']
    ])).to.equal(`a                    1
columnwithlotoftext  2`);
  });
});