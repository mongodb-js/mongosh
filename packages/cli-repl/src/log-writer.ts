// Note: This file should be kept as self-contained as possible, so that we can
// split it into a separate package and then re-use that in Compass.
import { ObjectId, EJSON } from 'bson';
import { once } from 'events';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { Writable } from 'stream';
import { inspect } from 'util';
import v8 from 'v8';

/**
 * A unique correlation ID for log lines. Always create these
 * using {@link mongoLogId()}, never directly.
 */
export interface MongoLogId {
  /** @internal */
  __value: number;
}

/** Create an ID for a given log line. */
export function mongoLogId(id: number): MongoLogId {
  return { __value: id };
}

/** An unformatted MongoDB log entry. */
export interface MongoLogEntry {
  /** Timestamp at which the log event occurred */
  t?: Date;
  /** Severity field */
  s: 'F' | 'E' | 'W' | 'I' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5';
  /** Component field */
  c: string;
  /** The message id field */
  id: MongoLogId;
  /** The context field */
  ctx: string;
  /** The message string field */
  msg: string;
  /** Additional information about the event in question */
  attr?: any;
}

/**
 * Verify that a given {@link MongoLogEntry} contains all necessary fields.
 * @returns Either a TypeError if the log entry is invalid, or null.
 */
function validateLogEntry(info: MongoLogEntry): Error | null {
  if (typeof info.s !== 'string') {
    return new TypeError('Cannot log messages without a severity field');
  }
  if (typeof info.c !== 'string') {
    return new TypeError('Cannot log messages without a component field');
  }
  if (typeof info.id?.__value !== 'number') {
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

/**
 * A helper class for writing formatted log information to an output stream.
 * This class itself is an object-mode Writable stream to which
 * {@link MongoLogEntry} objects can be written.
 *
 * This class does not do any I/O of its own, and only delegates that to
 * the target stream.
 */
export class MongoLogWriter extends Writable {
  _logId: string;
  _logFilePath: string | null;
  _target: Pick<Writable, 'write' | 'end'>;
  _now: () => Date;

  /**
   * @param logId A unique identifier for this log file. This is not used outside the `logId` getter.
   * @param logFilePath The target path for this log file, if any. This is not used outside the `logFilePath` getter.
   * @param target The Writable stream to write data to.
   * @param now An optional function that overrides computation of the current time. This is used for testing.
   */
  constructor(logId: string, logFilePath: string | null, target: Pick<Writable, 'write' | 'end'>, now?: () => Date) {
    super({ objectMode: true });
    this._logId = logId;
    this._logFilePath = logFilePath;
    this._target = target;
    this._now = now ?? (() => new Date());
  }

  /** Return the logId passed to the constructor. */
  get logId(): string {
    return this._logId;
  }

  /** Return the logFilePath passed to the constructor. */
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
    const fullInfo: Omit<MongoLogEntry, 'id'> & { id: number } = {
      t: info.t ?? this._now(),
      s: info.s,
      c: info.c,
      id: info.id.__value,
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

  /** Wait until all pending data has been written to the underlying stream. */
  async flush(): Promise<void> {
    await new Promise(resolve => this._target.write('', resolve));
  }

  /**
   * Write a log entry with severity 'I'.
   */
  info(component: string, id: MongoLogId, context: string, message: string, attr?: any): void {
    const logEntry: MongoLogEntry = {
      s: 'I',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    };
    this.write(logEntry);
  }

  /**
   * Write a log entry with severity 'W'.
   */
  warn(component: string, id: MongoLogId, context: string, message: string, attr?: any): void {
    const logEntry: MongoLogEntry = {
      s: 'W',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    };
    this.write(logEntry);
  }

  /**
   * Write a log entry with severity 'E'.
   */
  error(component: string, id: MongoLogId, context: string, message: string, attr?: any): void {
    const logEntry: MongoLogEntry = {
      s: 'E',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    };
    this.write(logEntry);
  }

  /**
   * Write a log entry with severity 'F'.
   */
  fatal(component: string, id: MongoLogId, context: string, message: string, attr?: any): void {
    const logEntry: MongoLogEntry = {
      s: 'F',
      c: component,
      id: id,
      ctx: context,
      msg: message,
      attr: attr
    };
    this.write(logEntry);
  }
}

/** Options used by MongoLogManager instances. */
interface MongoLogOptions {
  /** A base directory in which log files are stored. */
  directory: string;
  /** The number of calendar days after which old log files are deleted. */
  retentionDays: number;
  /** A handler for warnings related to a specific filesystem path. */
  onerror: (err: Error, path: string) => unknown | Promise<void>;
  /** A handler for errors related to a specific filesystem path. */
  onwarn: (err: Error, path: string) => unknown | Promise<void>;
}

/**
 * A manger for the log files of an application.
 * Log files will be stored in a single directory, following the
 * naming convention `${logId}_log`.
 */
export class MongoLogManager {
  _options: MongoLogOptions;

  constructor(options: MongoLogOptions) {
    this._options = options;
  }

  /** Clean up log files older than `retentionDays`. */
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

  /** Create a MongoLogWriter stream for a new log file. */
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
