import { expect } from 'chai';
import Platform from './platform';

describe('Platform', () => {
  describe('Platform.Windows', () => {
    it('returns win32', () => {
      expect(Platform.Windows).to.equal('win32');
    });
  });

  describe('Platform.MacOs', () => {
    it('returns darwin', () => {
      expect(Platform.MacOs).to.equal('darwin');
    });
  });

  describe('Platform.Linux', () => {
    it('returns linux', () => {
      expect(Platform.Linux).to.equal('linux');
    });
  });
});
