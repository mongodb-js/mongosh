import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';

const LINE_ENDING_RE = /\r?\n|\r(?!\n)/;
const CTRL_C = '\u0003';
const CTRL_D = '\u0004';

/**
 * A proxy for `tty.ReadStream` that allows to read
 * the stream line by line.
 *
 * Each time a newline is encountered the stream wont emit further data
 * untill `.nextLine()` is called.
 *
 * NOTE: the control sequences Ctrl+C and Ctrl+D are not buffered and instead
 * are forwarded regardless.
 *
 * Is possible to disable the "line splitting" by calling `.disableBlockOnNewline()` and
 * re-enable it by calling `.enableBlockOnNewLine()`.
 *
 * If the line splitting is disabled the stream will behave like
 * the proxied `tty.ReadStream`, forwarding all the characters.
 */
export class LineByLineInput {
  private _emitter: EventEmitter;
  private _originalInput: NodeJS.ReadStream;
  private _forwarding: boolean;
  private _blockOnNewLineEnabled: boolean;
  private _charQueue: string[];
  private _decoder: StringDecoder;

  constructor(readable: NodeJS.ReadStream) {
    this._emitter = new EventEmitter();
    this._originalInput = readable;
    this._forwarding = true;
    this._blockOnNewLineEnabled = true;
    this._charQueue = [];
    this._decoder = new StringDecoder('utf-8');

    readable.on('data', this._onData);

    const proxy = new Proxy(readable, {
      get: (target: NodeJS.ReadStream, property: string): any => {
        if (typeof property === 'string' &&
          !property.startsWith('_') &&
          typeof this[property] === 'function'
        ) {
          return this[property].bind(this);
        }

        return target[property];
      }
    });

    return (proxy as unknown) as LineByLineInput;
  }

  on(event: string, handler: (...args: any[]) => void): void {
    if (event === 'data') {
      this._emitter.on('data', handler);
      return;
    }

    this._originalInput.on(event, handler);
    return;
  }

  nextLine(): void {
    this._resumeForwarding();
    this._flush();
  }

  enableBlockOnNewLine(): void {
    this._blockOnNewLineEnabled = true;
  }

  disableBlockOnNewline(): void {
    this._blockOnNewLineEnabled = false;
    this._flush();
  }

  private _onData = (chunk: Buffer): void => {
    if (this._blockOnNewLineEnabled) {
      return this._forwardAndBlockOnNewline(chunk);
    }

    return this._forwardWithoutBlocking(chunk);
  };

  private _forwardAndBlockOnNewline(chunk: Buffer): void {
    const chars = this._decoder.write(chunk);
    for (const char of chars) {
      if (this._isCtrlC(char) || this._isCtrlD(char)) {
        this._emitChar(char);
      } else {
        this._charQueue.push(char);
      }
    }
    this._flush();
  }

  private _forwardWithoutBlocking(chunk: Buffer): void {
    // keeps decoding state consistent
    this._decoder.write(chunk);
    this._emitChunk(chunk);
  }

  private _pauseForwarding(): void {
    this._forwarding = false;
  }

  private _resumeForwarding(): void {
    this._forwarding = true;
  }

  private _shouldForward(): boolean {
    // If we are not blocking on new lines
    // we just forward everything as is,
    // otherwise we forward only if the forwarding
    // is not paused.

    return !this._blockOnNewLineEnabled || this._forwarding;
  }

  private _emitChar(char): void {
    this._emitChunk(Buffer.from(char, 'utf8'));
  }

  private _emitChunk(chunk: Buffer): void {
    this._emitter.emit('data', chunk);
  }

  private _flush(): void {
    while (
      this._charQueue.length &&
      this._shouldForward() &&

      // We don't forward residual characters we could
      // have in the buffer if in the meanwhile something
      // downstream explicitly called pause(), as that may cause
      // unexpected behaviors.
      !this._originalInput.isPaused()
    ) {
      const char = this._charQueue.shift();

      if (this._isLineEnding(char)) {
        this._pauseForwarding();
      }

      this._emitChar(char);
    }
  }

  private _isLineEnding(char: string): boolean {
    return LINE_ENDING_RE.test(char);
  }

  private _isCtrlD(char: string): boolean {
    return char === CTRL_D;
  }

  private _isCtrlC(char: string): boolean {
    return char === CTRL_C;
  }
}
