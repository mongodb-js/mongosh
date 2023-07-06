import { expect } from 'chai';
import { StringDecoder } from 'string_decoder';
import { EventEmitter } from 'events';
import { LineByLineInput } from './line-by-line-input';

describe('LineByLineInput', function () {
  let stdinMock: NodeJS.ReadStream;
  let decoder: StringDecoder;
  let forwardedChunks: string[];
  let lineByLineInput: LineByLineInput;

  beforeEach(function () {
    stdinMock = new EventEmitter() as NodeJS.ReadStream;
    stdinMock.isPaused = (): boolean => false;
    decoder = new StringDecoder();
    forwardedChunks = [];
    lineByLineInput = new LineByLineInput(stdinMock);
    lineByLineInput.start();
    lineByLineInput.on('data', (chunk) => {
      const decoded = decoder.write(chunk);
      if (decoded) {
        forwardedChunks.push(decoded);
      }
    });
  });

  context('when block on newline is enabled (default)', function () {
    it('does not forward characters after newline', function () {
      stdinMock.emit('data', Buffer.from('ab\nc'));
      expect(forwardedChunks).to.deep.equal(['ab', '\n']);
    });

    it('forwards CTRL-C anyway and as soon as is received', function () {
      stdinMock.emit('data', Buffer.from('\n\u0003'));
      expect(forwardedChunks).to.contain('\u0003');
    });

    it('forwards CTRL-D anyway and as soon as is received', function () {
      stdinMock.emit('data', Buffer.from('\n\u0004'));
      expect(forwardedChunks).to.contain('\u0004');
    });

    it('unblocks on nextline', function () {
      stdinMock.emit('data', Buffer.from('ab\nc'));
      lineByLineInput.nextLine();
      expect(forwardedChunks).to.deep.equal(['ab', '\n', 'c']);
    });

    it('groups \\r\\n together', function () {
      stdinMock.emit('data', Buffer.from('ab\r\nc'));
      lineByLineInput.nextLine();
      expect(forwardedChunks).to.deep.equal(['ab', '\r\n', 'c']);
    });
  });

  context('when block on newline is disabled', function () {
    it('does forwards all the characters', function () {
      lineByLineInput.disableBlockOnNewline();
      stdinMock.emit('data', Buffer.from('ab\nc'));
      expect(forwardedChunks).to.deep.equal(['ab\nc']);
    });
  });

  context('when block on newline is disabled and re-enabled', function () {
    it('does forwards all the characters', function () {
      lineByLineInput.disableBlockOnNewline();
      lineByLineInput.enableBlockOnNewLine();
      stdinMock.emit('data', Buffer.from('ab\nc'));
      expect(forwardedChunks).to.deep.equal(['ab', '\n']);
    });
  });

  context(
    'when a data listener calls nextLine() itself after Ctrl+C',
    function () {
      it('does not emit data while already emitting data', function () {
        let dataCalls = 0;
        let insideDataCalls = 0;
        lineByLineInput.on('data', () => {
          expect(insideDataCalls).to.equal(0);
          insideDataCalls++;
          if (dataCalls++ === 0) {
            lineByLineInput.nextLine();
          }
          insideDataCalls--;
        });
        stdinMock.emit('data', Buffer.from('foo\n\u0003'));
        expect(dataCalls).to.equal(3);
        expect(forwardedChunks).to.deep.equal(['\u0003', 'foo', '\n']);
      });
    }
  );
});
