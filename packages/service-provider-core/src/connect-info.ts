// ^ segment data is in snake_case: forgive me javascript, for i have sinned.

import getBuildInfo from 'mongodb-build-info';
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
}: {
  connectionString?: ConnectionString;
  buildInfo: any;
  atlasVersion: any;
  resolvedHostname?: string;
  isLocalAtlas: boolean;
}): ConnectionExtraInfo {
  const auth_type =
    connectionString?.searchParams.get('authMechanism') ?? undefined;
  const uri = connectionString?.toString() ?? '';

  buildInfo ??= {}; // We're currently not getting buildInfo with --apiStrict.
  const { isGenuine: is_genuine, serverName: non_genuine_server_name } =
    getBuildInfo.getGenuineMongoDB(uri);
  // Atlas Data Lake has been renamed to Atlas Data Federation
  const { isDataLake: is_data_federation, dlVersion: dl_version } =
    getBuildInfo.getDataLake(buildInfo);

  const { serverOs: server_os, serverArch: server_arch } =
    getBuildInfo.getBuildEnv(buildInfo);
  const isAtlas = !!atlasVersion?.atlasVersion || getBuildInfo.isAtlas(uri);

  return {
    ...getHostInformation(resolvedHostname || uri),
    is_atlas: isAtlas,
    server_version: buildInfo.version,
    node_version: process.version,
    server_os,
    uri,
    server_arch,
    is_enterprise: getBuildInfo.isEnterprise(buildInfo),
    auth_type,
    is_data_federation,
    is_stream: getBuildInfo.isAtlasStream(uri),
    dl_version,
    atlas_version: atlasVersion?.atlasVersion ?? null,
    is_genuine,
    non_genuine_server_name,
    is_local_atlas: isLocalAtlas,
  };
}
