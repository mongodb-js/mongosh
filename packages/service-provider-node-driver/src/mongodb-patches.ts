import type { MongoClient } from 'mongodb';

// Close a MongoClient + abort currently ongoing operations.
export function forceCloseMongoClient(
  client: MongoClient
): Promise<{ forceClosedConnections: number }> {
  let forceClosedConnections = 0;
  for (const server of (client as any).topology?.s?.servers?.values()) {
    const checkedOutConnections = server?.pool?.checkedOutConnections;
    for (const connection of checkedOutConnections ?? []) {
      forceClosedConnections++;
      connection.destroy({ force: true });
      // Immediately after destroying, act as if the close had happened,
      // but *not* as an actual 'close' event on the socket itself --
      // a close on the socket is communicated as a network error, which
      // is considered an retryable error by operations which are currently
      // running on this connection, but the whole point here is that these
      // operations should *not* be retried. So, we just act as if something
      // had happened that interrupts all ongoing operations and also is
      // supposed to destroy the connection (which is a no-op at this point).
      connection.onError(new Error('connection canceled by force close'));
    }
  }
  return client.close(true).then(() => ({ forceClosedConnections }));
}
