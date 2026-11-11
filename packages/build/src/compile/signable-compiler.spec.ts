import { expect } from 'chai';
import { patchNodeVcbuildForCi } from './signable-compiler';

describe('patchNodeVcbuildForCi', function () {
  // Excerpt from Node.js 24 vcbuild.bat, using the CRLF line endings of the
  // source tarball.
  const vcbuild = [
    '@if not defined DEBUG_HELPER @ECHO OFF',
    'if /i "%1"=="release"       set config=Release&set ltcg=1&set cctest=1&goto arg-ok',
    'set "msbcpu=/m:2"',
    'if "%NUMBER_OF_PROCESSORS%"=="1" set "msbcpu=/m:1"',
    'msbuild node.sln %msbcpu% /t:%target% /p:Configuration=%config%',
    '',
  ].join('\r\n');

  it('uses all available CPUs for MSBuild', function () {
    expect(patchNodeVcbuildForCi(vcbuild)).to.include(
      'set "msbcpu=/m:%NUMBER_OF_PROCESSORS%"'
    );
  });

  it('leaves the rest of the file untouched', function () {
    const patched = patchNodeVcbuildForCi(vcbuild);

    expect(patched).to.include(
      'if /i "%1"=="release"       set config=Release&set ltcg=1&set cctest=1&goto arg-ok'
    );
    expect(patched).to.include(
      'if "%NUMBER_OF_PROCESSORS%"=="1" set "msbcpu=/m:1"'
    );
    expect(patched).to.include(
      'msbuild node.sln %msbcpu% /t:%target% /p:Configuration=%config%'
    );
    expect(patched.split('\r\n')).to.have.length(vcbuild.split('\r\n').length);
  });

  it('does not change a vcbuild.bat with an unknown layout', function () {
    const unknown = 'some other content';
    expect(patchNodeVcbuildForCi(unknown)).to.equal(unknown);
  });
});
