// Note: This file should be kept as self-contained as possible, so that we can
// split it into a separate package and then re-use that in Compass.
import { ObjectId, EJSON } from 'bson';
import { once } from 'events';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { Writable } from 'stream';
import { inspect } from 'util';
import v8 from 'v8';

export interface MongoLogEntry {
  /** Timestamp at which the log event occurred */
  t?: Date;
  /** Severity field */
  s: 'F' | 'E' | 'W' | 'I' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  /** Component field */
  c: string;
  /** The message id field */
  id: number;
  /** The context field */
  ctx: string;
  /** The message string field */
  msg: string;
  /** Additional information about the event in question */
  attr?: any;
}

function validateLogEntry(info: MongoLogEntry): Error | null {
  if (typeof info.s !== 'string') {
    return new TypeError('Cannot log messages without a severity field');
  }
  if (typeof info.c !== 'string') {
    return new TypeError('Cannot log messages without a component field');
  }
  if (typeof info.id !== 'number') {
    return new TypeError('Cannot log messages without an id field');
  }
  if (typeof info.ctx !== 'string') {
    return new TypeError('Cannot log messages without a context field');
  }
  if (typeof info.msg !== 'string') {
    return new TypeError('Cannot log messages without a message field');
  }
  return null;
}

export class MongoLogWriter extends Writable {
  _logId: string;
  _logFilePath: string | null;
  _target: Pick<Writable, 'write' | 'end'>;
  _now: () => Date;

  constructor(logId: string, logFilePath: string | null, target: Pick<Writable, 'write' | 'end'>, now?: () => Date) {
    super({ objectMode: true });
    this._logId = logId;
    this._logFilePath = logFilePath;
    this._target = target;
    this._now = now ?? (() => new Date());
  }

  get logId(): string {
    return this._logId;
  }

  get logFilePath(): string | null {
    return this._logFilePath;
  }

  _write(info: MongoLogEntry, encoding: unknown, callback: (err?: Error | null | undefined) => void): void {
    const validationError = validateLogEntry(info);
    if (validationError) {
      callback(validationError);
      return;
    }

    // Copy the object to ensure the order of properties.
    const fullInfo: MongoLogEntry = {
      t: info.t ?? this._now(),
      s: info.s,
      c: info.c,
      id: info.id,
      ctx: info.ctx,
      msg: info.msg
    };
    if (info.attr) {
      if (Object.prototype.toString.call(info.attr) === '[object Error]') {
        fullInfo.attr = {
          stack: info.attr.stack,
          name: info.attr.name,
          message: info.attr.message,
          code: info.attr.code,
          ...info.attr
        };
      } else {
        fullInfo.attr = info.attr;
      }
    }

    // The attr field may contain arbitrary data. If we cannot serialize it,
    // we fall back to increasingly less faithful representations of it.
    try {
      EJSON.stringify(fullInfo.attr);
    } catch {
      try {
        const cloned = v8.deserialize(v8.serialize(fullInfo.attr));
        EJSON.stringify(cloned);
        fullInfo.attr = cloned;
      } catch {
        try {
          const cloned = JSON.parse(JSON.stringify(fullInfo.attr));
          EJSON.stringify(cloned);
          fullInfo.attr = cloned;
        } catch {
          fullInfo.attr = { _inspected: inspect(fullInfo.attr) };
        }
      }
    }
    this._target.write(EJSON.stringify(fullInfo, { relaxed: true }) + '\n', callback);
  }

  _final(callback: (err?: Error | null | undefined) => void): void {
    this._target.end(callback);
  }

  async flush(): Promise<void> {
    await new Promise(resolve => this._target.write('', resolve));
  }

  info(component: string, id: number, context: string, message: string, attr?: any): void {
    this.write({
      s: 'I',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    });
  }

  warn(component: string, id: number, context: string, message: string, attr?: any): void {
    this.write({
      s: 'W',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    });
  }

  error(component: string, id: number, context: string, message: string, attr?: any): void {
    this.write({
      s: 'E',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    });
  }

  fatal(component: string, id: number, context: string, message: string, attr?: any): void {
    this.write({
      s: 'F',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    });
  }
}

interface MongoLogOptions {
  directory: string;
  retentionDays: number;
  onerror: (err: Error, path: string) => unknown | Promise<void>;
  onwarn: (err: Error, path: string) => unknown | Promise<void>;
}

export class MongoLogManager {
  _options: MongoLogOptions;

  constructor(options: MongoLogOptions) {
    this._options = options;
  }

  async cleanupOldLogfiles(): Promise<void> {
    const dir = this._options.directory;
    let dirHandle;
    try {
      dirHandle = await fs.opendir(dir);
    } catch {
      return;
    }
    for await (const dirent of dirHandle) {
      if (!dirent.isFile()) continue;
      const { id } = dirent.name.match(/^(?<id>[a-f0-9]{24})_log$/i)?.groups ?? {};
      if (!id) continue;
      // Delete files older than n days
      if (new ObjectId(id).generationTime < (Date.now() / 1000) - this._options.retentionDays * 86400) {
        const toUnlink = path.join(dir, dirent.name);
        try {
          await fs.unlink(toUnlink);
        } catch (err) {
          this._options.onerror(err, toUnlink);
        }
      }
    }
  }

  async createLogWriter(): Promise<MongoLogWriter> {
    const logId = new ObjectId().toString();
    const logFilePath = path.join(this._options.directory, `${logId}_log`);

    let stream: Writable;
    try {
      stream = createWriteStream(logFilePath, { mode: 0o600 });
      await once(stream, 'ready');
    } catch (err) {
      this._options.onwarn(err, logFilePath);
      stream = new Writable({
        write(chunk, enc, cb) {
          // Just ignore log data if there was an error.
          cb();
        }
      });
      return new MongoLogWriter(logId, null, stream);
    }
    return new MongoLogWriter(logId, logFilePath, stream);
  }
}
