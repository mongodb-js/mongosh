import type { ReplOptions, REPLServer } from 'repl';
import { start } from 'repl';
import type { Readable, Writable } from 'stream';
import { PassThrough } from 'stream';
import { tick } from '../test/repl-helpers';
import { fixNode60446, installPasteSupport } from './repl-paste-support';
import { expect } from 'chai';

function createTerminalRepl(extraOpts: Partial<ReplOptions> = {}): {
  input: Writable;
  output: Readable;
  repl: REPLServer;
} {
  const input = new PassThrough();
  const output = new PassThrough({ encoding: 'utf8' });

  const repl = start({
    input: input,
    output: output,
    prompt: '> ',
    terminal: true,
    useColors: false,
    ...extraOpts,
  });
  fixNode60446(repl);
  return { input, output, repl };
}

describe('installPasteSupport', function () {
  it('does nothing for non-terminal REPL instances', async function () {
    const { repl, output } = createTerminalRepl({ terminal: false });
    const onFinish = installPasteSupport(repl);
    await tick();
    expect(output.read()).to.equal('> ');
    expect(onFinish).to.equal('');
  });

  it('prints a control character sequence that indicates support for bracketed paste', async function () {
    const { repl, output } = createTerminalRepl();
    const onFinish = installPasteSupport(repl);
    await tick();
    expect(output.read()).to.include('\x1B[?2004h');
    expect(onFinish).to.include('\x1B[?2004l');
  });

  it('echoes back control characters in the input by default', async function () {
    const { repl, input, output } = createTerminalRepl();
    installPasteSupport(repl);
    await tick();
    output.read(); // Ignore prompt etc.
    input.write('foo\x1b[Dbar'); // ESC[D = 1 character to the left
    await tick();
    // Expected output changed after https://github.com/nodejs/node/pull/59857
    // because now characters aren't handled one-by-one anymore.
    expect(output.read()).to.be.oneOf([
      'foo\x1B[1D\x1B[1G\x1B[0J> fobo\x1B[6G\x1B[1G\x1B[0J> fobao\x1B[7G\x1B[1G\x1B[0J> fobaro\x1B[8G',
      'foo\x1B[1Dba\x1B[1G\x1B[0J> fobaro\x1B[8G',
    ]);
  });

  it('ignores control characters in the input while pasting', async function () {
    const { repl, input, output } = createTerminalRepl();
    installPasteSupport(repl);
    await tick();
    output.read(); // Ignore prompt etc.
    input.write('\x1b[200~foo\x1b[Dbar\x1b[201~'); // ESC[D = 1 character to the left
    await tick();
    expect(output.read()).to.equal('foobar');
  });

  it('resets to accepting control characters in the input after pasting', async function () {
    const { repl, input, output } = createTerminalRepl();
    installPasteSupport(repl);
    await tick();
    output.read();
    input.write('\x1b[200~foo\x1b[Dbar\x1b[201~'); // ESC[D = 1 character to the left
    await tick();
    output.read();
    input.write('foo\x1b[Dbar');
    await tick();
    expect(output.read()).to.be.oneOf([
      'foo\x1B[1D\x1B[1G\x1B[0J> foobarfobo\x1B[12G\x1B[1G\x1B[0J> foobarfobao\x1B[13G\x1B[1G\x1B[0J> foobarfobaro\x1B[14G',
      'foo\x1B[1Dba\x1B[1G\x1B[0J> foobarfobaro\x1B[14G',
    ]);
  });

  it('allows a few special characters while pasting', async function () {
    const { repl, input, output } = createTerminalRepl();
    installPasteSupport(repl);
    await tick();
    output.read();
    input.write('\x1b[200~12*34\n_*_\n\x1b[201~');
    await tick();
    expect(output.read()).to.include((12 * 34) ** 2);
  });
});
