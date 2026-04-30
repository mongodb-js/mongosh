import { getDeviceId } from '@mongodb-js/device-id';
import { type MongoshBus } from '@mongosh/types';

export async function getDeviceIdForMongosh({
  bus,
  signal,
}: {
  bus: MongoshBus;
  signal: AbortSignal;
}): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getMachineId = require('native-machine-id').getMachineId;
    return await getDeviceId({
      getMachineId: () => getMachineId({ raw: true }),
      onError: (reason, error) => {
        if (reason === 'abort') {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        bus.emit('mongosh:error', error, 'telemetry');
      },
      abortSignal: signal,
    });
  } catch (error) {
    bus.emit('mongosh:error', error as Error, 'telemetry');
    return 'unknown';
  }
}
