import { expect } from 'chai';
import { StringDecoder } from 'string_decoder';
import { EventEmitter } from 'events';
import { LineByLineInput } from './line-by-line-input';

describe('LineByLineInput', () => {
  let stdinMock: NodeJS.ReadStream;
  let decoder: StringDecoder;
  let forwardedChunks: string[];
  let lineByLineInput: LineByLineInput;

  beforeEach(() => {
    stdinMock = new EventEmitter() as NodeJS.ReadStream;
    stdinMock.isPaused = (): boolean => false;
    decoder = new StringDecoder();
    forwardedChunks = [];
    lineByLineInput = new LineByLineInput(stdinMock);
    lineByLineInput.on('data', (chunk) => {
      const decoded = decoder.write(chunk);
      if (decoded) {
        forwardedChunks.push(decoded);
      }
    });
  });

  context('when block on newline is enabled (default)', () => {
    it('does not forward characters after newline', () => {
      stdinMock.emit('data', Buffer.from('ab\nc'));
      expect(forwardedChunks).to.deep.equal(['a', 'b', '\n']);
    });

    it('forwards CTRL-C anyway and as soon as is received', () => {
      stdinMock.emit('data', Buffer.from('\n\u0003'));
      expect(forwardedChunks).to.contain('\u0003');
    });

    it('forwards CTRL-D anyway and as soon as is received', () => {
      stdinMock.emit('data', Buffer.from('\n\u0004'));
      expect(forwardedChunks).to.contain('\u0004');
    });

    it('unblocks on nextline', () => {
      stdinMock.emit('data', Buffer.from('ab\nc'));
      lineByLineInput.nextLine();
      expect(forwardedChunks).to.deep.equal(['a', 'b', '\n', 'c']);
    });
  });

  context('when block on newline is disabled', () => {
    it('does forwards all the characters', () => {
      lineByLineInput.disableBlockOnNewline();
      stdinMock.emit('data', Buffer.from('ab\nc'));
      expect(forwardedChunks).to.deep.equal(['ab\nc']);
    });
  });

  context('when block on newline is disabled and re-enabled', () => {
    it('does forwards all the characters', () => {
      lineByLineInput.disableBlockOnNewline();
      lineByLineInput.enableBlockOnNewLine();
      stdinMock.emit('data', Buffer.from('ab\nc'));
      expect(forwardedChunks).to.deep.equal(['a', 'b', '\n']);
    });
  });
});
