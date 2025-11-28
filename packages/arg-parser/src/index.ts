import type { DevtoolsConnectOptions } from '@mongodb-js/devtools-connect';
import type { CliOptions } from './cli-options';
import { generateUri } from './uri-generator';
import { mapCliToDriver } from './arg-mapper';

export interface ConnectionInfo {
  connectionString: string;
  driverOptions: Omit<
    DevtoolsConnectOptions,
    'productName' | 'productDocsLink'
  >;
}

export { CliOptions, DevtoolsConnectOptions, mapCliToDriver };

export function generateConnectionInfoFromCliArgs(
  options: CliOptions
): ConnectionInfo {
  const connectionString = generateUri(options);
  return mapCliToDriver(options, { connectionString, driverOptions: {} });
}
