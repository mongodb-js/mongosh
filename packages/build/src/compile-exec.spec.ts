import path from 'path';
import os from 'os';
import fs from 'fs';
import { expect } from 'chai';
import compileExec, {
  ExecName,
  Target,
  determineExecName,
  determineTarget,
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

  describe('Target', () => {
    describe('Target.Windows', () => {
      it('returns win', () => {
        expect(Target.Windows).to.equal('win32-x86-12.4.0');
      });
    });

    describe('Target.MacOs', () => {
      it('returns macos', () => {
        expect(Target.MacOs).to.equal('darwin-12.4.0');
      });
    });

    describe('Target.Linux', () => {
      it('returns linux', () => {
        expect(Target.Linux).to.equal('linux-x86-12.4.0');
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

  describe('.determineTarget', () => {
    context('when the platform is windows', () => {
      it('returns win', () => {
        expect(determineTarget(Platform.Windows)).to.equal(Target.Windows);
      });
    });

    context('when the platform is macos', () => {
      it('returns macos', () => {
        expect(determineTarget(Platform.MacOs)).to.equal(Target.MacOs);
      });
    });

    context('when the platform is linux', () => {
      it('returns linux', () => {
        expect(determineTarget(Platform.Linux)).to.equal(Target.Linux);
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
