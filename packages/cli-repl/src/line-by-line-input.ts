import { Readable } from 'stream';
import { StringDecoder } from 'string_decoder';
import type { ReadStream } from 'tty';

const LINE_ENDING_RE = /\r?\n|\r(?!\n)/;
const CTRL_C = '\u0003';
const CTRL_D = '\u0004';

/**
 * Text held while a line is blocked. Past this, the original stream is
 * paused so a pipe stops instead of the queue growing for the whole command.
 */
export const LINE_BY_LINE_QUEUE_LIMIT = 1024 * 1024;

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
export class LineByLineInput extends Readable {
  private _originalInput: Readable & Partial<ReadStream>;
  private _forwarding: boolean;
  private _blockOnNewLineEnabled: boolean;
  private _charQueue: (string | null)[];
  private _queuedChars: number;
  private _queueLimit: number;
  private _sourcePausedByUs: boolean;
  private _started: boolean;
  private _closed: boolean;
  private _decoder: StringDecoder;
  private _insidePushCalls: number;

  constructor(
    readable: Readable & Partial<ReadStream>,
    options?: { queueLimit?: number }
  ) {
    super();
    this._originalInput = readable;
    this._queueLimit = options?.queueLimit ?? LINE_BY_LINE_QUEUE_LIMIT;
    this._forwarding = true;
    this._blockOnNewLineEnabled = true;
    this._charQueue = [];
    this._queuedChars = 0;
    this._sourcePausedByUs = false;
    this._started = false;
    this._closed = false;
    this._decoder = new StringDecoder('utf-8');
    this._insidePushCalls = 0;

    const isReadableEvent = (name: string) =>
      name === 'readable' ||
      name === 'data' ||
      name === 'end' ||
      name === 'keypress';

    // Listeners for events that are not related to this object being a readable
    // stream are also added to the wrapped object.
    this.on(
      'removeListener',
      (name: string, handler: (...args: any[]) => void) => {
        if (!isReadableEvent(name)) {
          this._originalInput.removeListener(name, handler);
        }
      }
    );
    this.on(
      'newListener',
      (name: string, handler: (...args: any[]) => void) => {
        if (!isReadableEvent(name)) {
          this._originalInput.addListener(name, handler);
        }
      }
    );

    const proxy = new Proxy(readable, {
      get: (target: typeof readable, property: string): any => {
        if (
          typeof property === 'string' &&
          !property.startsWith('_') &&
          typeof (this as any)[property] === 'function'
        ) {
          return (this as any)[property].bind(this);
        }

        return (target as any)[property];
      },
    });

    return proxy as unknown as LineByLineInput;
  }

  /** Start processing data from the original input stream. */
  start(): void {
    if (this._closed || this._started) {
      return;
    }
    this._started = true;
    this._originalInput.on('data', this._onData);
    this._originalInput.on('end', this._onEnd);
  }

  /**
   * Detach from the original stream and drop anything still queued.
   * MongoshNodeRepl.close() calls this so an embedded host whose stdin
   * stays open does not keep feeding a shell that has already closed.
   */
  close(): void {
    this._closed = true;
    this._started = false;
    this._originalInput.removeListener('data', this._onData);
    this._originalInput.removeListener('end', this._onEnd);
    this._charQueue.length = 0;
    this._queuedChars = 0;
    if (this._sourcePausedByUs) {
      this._sourcePausedByUs = false;
      this._originalInput.resume?.();
    }
  }

  _read(): void {
    this._flush();
  }

  /**
   * Readable.resume() can ask for data before it clears its paused flag.
   * Flush again once that call returns so a resumed proxy delivers the
   * characters it held.
   */
  resume(): this {
    super.resume();
    this._flush();
    return this;
  }

  /** Proceed to read more data from the input stream. */
  nextLine(): void {
    this._resumeForwarding();
    this._flush();
  }

  /** Set this LineByLineInput instance into block-on-newline mode. */
  enableBlockOnNewLine(): void {
    this._blockOnNewLineEnabled = true;
  }

  /** Set this LineByLineInput instance into pass-through mode. */
  disableBlockOnNewline(): void {
    this._blockOnNewLineEnabled = false;
    this._flush();
  }

  private _onEnd = (): void => {
    this._onData(null);
  };

  private _onData = (chunk: Buffer | string | null): void => {
    if (this._closed) {
      return;
    }
    if (this._blockOnNewLineEnabled) {
      if (chunk !== null && this._shouldDropIncoming()) {
        return;
      }
      return this._forwardAndBlockOnNewline(chunk);
    }

    return this._forwardWithoutBlocking(chunk);
  };

  private _forwardAndBlockOnNewline(chunk: Buffer | string | null): void {
    const chars = chunk === null ? [null] : this._decoder.write(chunk);
    for (const char of chars) {
      // Look up the last character we have queued up, if any:
      const lastCharQueueEntry = this._charQueue.length
        ? this._charQueue[this._charQueue.length - 1]
        : '';
      const lastCharQueueChar = lastCharQueueEntry?.length
        ? lastCharQueueEntry[lastCharQueueEntry.length - 1]
        : '';

      if (this._isCtrlC(char) || this._isCtrlD(char)) {
        this.push(char);
      } else if (
        (char === '\n' && lastCharQueueChar === '\r') ||
        (this._isRegularCharacter(char) &&
          lastCharQueueChar !== '' &&
          this._isRegularCharacter(lastCharQueueChar))
      ) {
        (this._charQueue[this._charQueue.length - 1] as string) +=
          char as string;
        this._queuedChars += (char as string).length;
      } else {
        this._charQueue.push(char);
        if (typeof char === 'string') {
          this._queuedChars += char.length;
        }
      }
    }
    this._pauseSourceIfOverCap();
    this._flush();
  }

  private _forwardWithoutBlocking(chunk: Buffer | string | null): void {
    if (chunk !== null) {
      // keeps decoding state consistent
      this._decoder.write(chunk);
    }
    this.push(chunk);
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

  private _flush(): void {
    // If we are already inside a push() call, then we do not need to flush
    // the queue again.
    if (this._insidePushCalls !== 0) {
      return;
    }
    while (
      this._charQueue.length &&
      this._shouldForward() &&
      // Readline pauses this proxy, not the original stdin. Honor that
      // pause, and also stop when push() asks for backpressure.
      !this.isPaused()
    ) {
      const char = this._charQueue.shift() as string | null;
      if (typeof char === 'string') {
        this._queuedChars -= char.length;
      }

      if (this._isLineEnding(char)) {
        this._pauseForwarding();
      }

      if (!this.push(char)) {
        break;
      }
    }
    this._resumeSourceIfDrained();
  }

  private _pauseSourceIfOverCap(): void {
    if (this._queuedChars <= this._queueLimit || this._sourcePausedByUs) {
      return;
    }
    if (typeof this._originalInput.pause !== 'function') {
      return;
    }
    this._originalInput.pause();
    this._sourcePausedByUs = true;
  }

  private _resumeSourceIfDrained(): void {
    if (!this._sourcePausedByUs || this._queuedChars > this._queueLimit) {
      return;
    }
    this._sourcePausedByUs = false;
    this._originalInput.resume?.();
  }

  /**
   * A chunk that arrives after the cap is kept when the source can be
   * paused, because that chunk has already been read. Further chunks are
   * dropped only when the source has no pause().
   */
  private _shouldDropIncoming(): boolean {
    if (this._queuedChars <= this._queueLimit) {
      return false;
    }
    if (typeof this._originalInput.pause === 'function') {
      this._pauseSourceIfOverCap();
      return false;
    }
    return true;
  }

  private _isRegularCharacter(char: string | null): boolean {
    return (
      char !== null &&
      !this._isLineEnding(char) &&
      !this._isCtrlC(char) &&
      !this._isCtrlD(char)
    );
  }

  private _isLineEnding(char: string | null): boolean {
    return char !== null && LINE_ENDING_RE.test(char);
  }

  private _isCtrlD(char: string | null): boolean {
    return char === CTRL_D;
  }

  private _isCtrlC(char: string | null): boolean {
    return char === CTRL_C;
  }

  push(chunk: Buffer | string | null): boolean {
    this._insidePushCalls++;
    try {
      return super.push(chunk);
    } finally {
      this._insidePushCalls--;
    }
  }
}
