import fs from 'fs';
import path from 'path';

type StoredSessions = Record<string, { ticket: string; storedAt: number }>;

const DEFAULT_TTL_MS = 6 * 3_600_000; // session tickets go stale server-side

/**
 * Persists TLS session tickets across mongosh sessions so the next process
 * can resume the telemetry TLS handshake in a single round-trip
 * (MONGOSH-3454). Tickets are resumption secrets: the file is written with
 * mode 0600 next to mongosh's other local state. This is a cache — every
 * failure (missing file, corrupt JSON, failed write) is silent.
 */
export class TlsSessionStore {
  // tsconfig has erasableSyntaxOnly: true, which disallows TS parameter
  // properties (they desugar to a constructor body assignment, which isn't
  // erasable syntax); declared as fields and assigned in the constructor
  // body instead.
  private readonly filePath: string;
  private readonly ttlMs: number;
  private sessions?: StoredSessions;
  private pendingWrite: Promise<void> = Promise.resolve();

  constructor(filePath: string, ttlMs: number = DEFAULT_TTL_MS) {
    this.filePath = filePath;
    this.ttlMs = ttlMs;
  }

  private load(): StoredSessions {
    if (!this.sessions) {
      try {
        const parsed: unknown = JSON.parse(
          fs.readFileSync(this.filePath, 'utf8')
        );
        this.sessions =
          typeof parsed === 'object' &&
          parsed !== null &&
          !Array.isArray(parsed)
            ? (parsed as StoredSessions)
            : {};
      } catch {
        this.sessions = {};
      }
    }
    return this.sessions;
  }

  get(host: string): Buffer | undefined {
    const entry = this.load()[host];
    if (!entry?.ticket || Date.now() - entry.storedAt > this.ttlMs) {
      return undefined;
    }
    return Buffer.from(entry.ticket, 'base64');
  }

  set(host: string, ticket: Buffer): void {
    const sessions = this.load();
    sessions[host] = {
      ticket: ticket.toString('base64'),
      storedAt: Date.now(),
    };
    // Best-effort async persist; within this process the in-memory copy is
    // already up to date even if the write never lands. Chained onto the
    // previous pendingWrite (rather than replacing it) so back-to-back
    // tickets — TLS 1.3 servers commonly send two NewSessionTickets in a
    // row — persist in call order instead of racing two unordered
    // writeFile calls to the same path, where the older write could win.
    this.pendingWrite = this.pendingWrite
      .then(() =>
        fs.promises.mkdir(path.dirname(this.filePath), { recursive: true })
      )
      .then(() =>
        fs.promises.writeFile(this.filePath, JSON.stringify(sessions), {
          mode: 0o600,
        })
      )
      .catch(() => undefined);
  }

  /** Resolves once the most recent persist has landed (or failed silently). */
  flush(): Promise<void> {
    return this.pendingWrite;
  }
}
