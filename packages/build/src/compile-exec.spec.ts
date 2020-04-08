import { expect } from 'chai';
import {
  ExecName,
  Platform,
  determineExecName
} from './compile-exec';

describe('compile module', () => {
  describe('ExecName', () => {
    describe('ExecName.Windows', () => {
      it('returns mongosh.exe', () => {
        expect(ExecName.Windows).to.equal('mongosh.exe');
      });
    });

    describe('ExecName.Posix', () => {
      it('returns mongosh', () => {
        expect(ExecName.Posix).to.equal('mongosh');
      });
    });
  });

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

  describe('.determineExecName', () => {
    context('when the platform is windows', () => {
      it('returns mongosh.exe', () => {
        expect(determineExecName(Platform.Windows)).to.equal(ExecName.Windows);
      });
    });

    context('when the platform is not windows', () => {
      it('returns mongosh', () => {
        expect(determineExecName(Platform.Linux)).to.equal(ExecName.Posix);
      });
    });
  });
});
