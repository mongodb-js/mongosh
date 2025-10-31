// ^ segment data is in snake_case: forgive me javascript, for i have sinned.

import * as getBuildInfo from 'mongodb-build-info';
import type { ConnectionString } from 'mongodb-connection-string-url';

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

export default function getConnectExtraInfo({
  connectionString,
  buildInfo,
  atlasVersion,
  resolvedHostname,
  isLocalAtlas,
  serverName = 'unknown',
}: {
  connectionString?: ConnectionString;
  buildInfo: any;
  atlasVersion: any;
  resolvedHostname?: string;
  isLocalAtlas: boolean;
  serverName?: string;
}): ConnectionExtraInfo {
  const auth_type =
    connectionString?.searchParams.get('authMechanism') ?? undefined;
  const uri = connectionString?.toString() ?? '';

  buildInfo ??= {}; // We're currently not getting buildInfo with --apiStrict.
  // Atlas Data Lake has been renamed to Atlas Data Federation
  const { isDataLake: is_data_federation, dlVersion } =
    getBuildInfo.getDataLake(buildInfo);

  const { serverOs, serverArch } = getBuildInfo.getBuildEnv(buildInfo);
  const isAtlas = !!atlasVersion?.atlasVersion || getBuildInfo.isAtlas(uri);

  return {
    ...getHostInformation(resolvedHostname || uri),
    is_atlas: isAtlas,
    server_version: buildInfo.version,
    node_version: process.version,
    server_os: serverOs || undefined,
    uri,
    server_arch: serverArch || undefined,
    is_enterprise: getBuildInfo.isEnterprise(buildInfo),
    auth_type,
    is_data_federation,
    is_stream: getBuildInfo.isAtlasStream(uri),
    dl_version: dlVersion || undefined,
    atlas_version: atlasVersion?.atlasVersion ?? null,
    is_genuine: serverName === 'mongodb' || serverName === 'unknown',
    non_genuine_server_name: serverName,
    is_local_atlas: isLocalAtlas,
  };
}
