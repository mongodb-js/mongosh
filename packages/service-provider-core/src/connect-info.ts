// ^ segment data is in snake_case: forgive me javascript, for i have sinned.

import * as getBuildInfo from 'mongodb-build-info';
import type { ConnectionString } from 'mongodb-connection-string-url';

import type { Document } from './all-transport-types';

export type ConnectionExtraInfo = {
  is_atlas?: boolean;
  server_version?: string;
  server_os?: string;
  server_arch?: string;
  is_enterprise?: boolean;
  auth_type?: string;
  is_data_federation?: boolean;
  is_stream?: boolean;
  dl_version?: string;
  atlas_version?: string;
  is_genuine?: boolean;
  non_genuine_server_name?: string;
  node_version?: string;
  uri: string;
  is_local_atlas?: boolean;
} & HostInformation;

export type HostInformation = {
  is_localhost?: boolean;
  is_atlas_url?: boolean;
  is_do_url?: boolean; // Is digital ocean url.
};

function getHostInformation(host?: string): HostInformation {
  if (!host) {
    return {
      is_localhost: false,
      is_do_url: false,
      is_atlas_url: false,
    };
  }

  if (getBuildInfo.isLocalhost(host)) {
    return {
      is_localhost: true,
      is_do_url: false,
      is_atlas_url: false,
    };
  }

  if (getBuildInfo.isDigitalOcean(host)) {
    return {
      is_localhost: false,
      is_do_url: true,
      is_atlas_url: false,
    };
  }

  return {
    is_localhost: false,
    is_do_url: false,
    is_atlas_url: getBuildInfo.isAtlas(host),
  };
}

export default async function getConnectExtraInfo({
  connectionString,
  buildInfo,
  atlasVersion,
  resolvedHostname,
  isLocalAtlas,
  adminCommand,
}: {
  connectionString?: ConnectionString;
  buildInfo: Promise<Document | null>;
  atlasVersion: string | undefined;
  resolvedHostname?: string;
  isLocalAtlas: boolean;
  adminCommand: (document: Document) => Promise<Document>;
}): Promise<ConnectionExtraInfo> {
  const auth_type =
    connectionString?.searchParams.get('authMechanism') ?? undefined;
  const uri = connectionString?.toString() ?? '';

  const serverName = await getBuildInfo.identifyServerName({
    connectionString: uri,
    buildInfo: buildInfo.then((info) => info ?? {}),
    adminCommand,
  });
  // Atlas Data Lake has been renamed to Atlas Data Federation
  const { isDataLake: is_data_federation, dlVersion } =
    getBuildInfo.getDataLake(await buildInfo);

  const { serverOs, serverArch } = getBuildInfo.getBuildEnv(await buildInfo);
  const isAtlas = !!atlasVersion || getBuildInfo.isAtlas(uri);
  const serverVersion = await buildInfo.then((info) =>
    typeof info?.version === 'string' ? info.version : undefined
  );

  return {
    ...getHostInformation(resolvedHostname || uri),
    is_atlas: isAtlas,
    server_version: serverVersion,
    node_version: process.version,
    server_os: serverOs || undefined,
    uri,
    server_arch: serverArch || undefined,
    is_enterprise: getBuildInfo.isEnterprise(await buildInfo),
    auth_type,
    is_data_federation,
    is_stream: getBuildInfo.isAtlasStream(uri),
    dl_version: dlVersion || undefined,
    atlas_version: atlasVersion,
    // When the server name is 'unknown', we cannot be certain that it's non-genuine
    is_genuine: serverName === 'mongodb' || serverName === 'unknown',
    non_genuine_server_name: serverName,
    is_local_atlas: isLocalAtlas,
  };
}
