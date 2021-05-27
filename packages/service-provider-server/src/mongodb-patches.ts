import { MongoshInternalError } from '@mongosh/errors';
import { Callback, CloseOptions } from 'mongodb';

// We "rename" any here for more clarity below
type ConnectionPool = any;
type Connection = any;

let alreadyPatched = false;

// TODO: revisit whether we still need monkey patching in light of NODE-3263
export function ensureMongoNodeNativePatchesAreApplied(): void {
  if (alreadyPatched) {
    return;
  }

  patchConnectionPoolTracking();

  alreadyPatched = true;
}

const poolToConnections = new Map<ConnectionPool, Set<Connection>>();

function patchConnectionPoolTracking(): void {
  const connectionPoolPrototype: ConnectionPool = require('mongodb/lib/cmap/connection_pool').ConnectionPool.prototype;
  if (!connectionPoolPrototype) {
    throw new MongoshInternalError('Failed to setup connection handling');
  }

  const originalCheckOut = connectionPoolPrototype.checkOut;
  const newCheckOut: typeof originalCheckOut = function(this: ConnectionPool, cb: Callback<Connection>): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const pool = this;
    originalCheckOut.call(this, function(this: any, error: any, connection: Connection) {
      if (connection) {
        let connections = poolToConnections.get(pool);
        if (!connections) {
          connections = new Set<Connection>();
          poolToConnections.set(pool, connections);
        }
        connections.add(connection);
      }

      cb.call(this, error, connection);
    });
  };
  connectionPoolPrototype.checkOut = newCheckOut;

  const originalCheckIn = connectionPoolPrototype.checkIn;
  const newCheckIn: typeof originalCheckIn = function(this: ConnectionPool, connection: Connection): void {
    if (connection) {
      const connections = poolToConnections.get(this);
      if (connections) {
        connections.delete(connection);
      }
    }
    originalCheckIn.call(this, connection);
  };
  connectionPoolPrototype.checkIn = newCheckIn;

  const originalClose = connectionPoolPrototype.close;
  const newClose: typeof originalClose = function(this: ConnectionPool, options: CloseOptions | Callback<void>, cb?: Callback<void>): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const pool = this;
    const connections = poolToConnections.get(pool);
    if (!pool.closed && connections && typeof options === 'object' && options.force) {
      const originalCallback = cb;
      cb = function(this: any, error: any, result: any) {
        poolToConnections.delete(pool);
        [...connections].forEach(c => c.destroy({ force: true }));

        if (originalCallback) {
          originalCallback.call(this, error, result);
        }
      };
    }

    originalClose.call(this, options as any, cb as any);
  };
  connectionPoolPrototype.close = newClose;
}
