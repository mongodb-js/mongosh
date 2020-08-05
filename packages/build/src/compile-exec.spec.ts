import { expect } from 'chai';
import {
  ExecName,
  determineExecName,
  executablePath
} from './compile-exec';
import Platform from './platform';

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

  describe('.executablePath', () => {
    context('when the platform is windows', () => {
      it('returns the path', () => {
        expect(executablePath('', Platform.Windows)).to.equal('mongosh.exe');
      });
    });

    context('when the platform is macos', () => {
      it('returns the path', () => {
        expect(executablePath('', Platform.MacOs)).to.equal('mongosh');
      });
    });

    context('when the platform is linux', () => {
      it('returns the path', () => {
        expect(executablePath('', Platform.Linux)).to.equal('mongosh');
      });
    });
  });
});
