// ^ segment data is in snake_case: forgive me javascript, for i have sinned.

import getBuildInfo from 'mongodb-build-info';

export interface ConnectInfo {
  is_atlas: boolean;
  is_localhost: boolean;
  is_do: boolean;
  server_version: string;
  mongosh_version: string;
  server_os?: string;
  server_arch?: string;
  is_enterprise: boolean;
  auth_type?: string;
  is_data_federation: boolean;
  dl_version?: string;
  atlas_version?: string;
  is_genuine: boolean;
  non_genuine_server_name: string;
  node_version: string;
  uri: string;
}

export default function getConnectInfo(
  uri: string,
  mongoshVersion: string,
  buildInfo: any,
  atlasVersion: any,
  topology: any
): ConnectInfo {
  buildInfo ??= {}; // We're currently not getting buildInfo with --apiStrict.
  const { isGenuine: is_genuine, serverName: non_genuine_server_name } =
    getBuildInfo.getGenuineMongoDB(uri);
  // Atlas Data Lake has been renamed to Atlas Data Federation
  const { isDataLake: is_data_federation, dlVersion: dl_version } =
    getBuildInfo.getDataLake(buildInfo);

  const auth_type = topology.s.credentials
    ? topology.s.credentials.mechanism
    : null;
  const { serverOs: server_os, serverArch: server_arch } =
    getBuildInfo.getBuildEnv(buildInfo);

  return {
    is_atlas: !!atlasVersion?.atlasVersion || getBuildInfo.isAtlas(uri),
    is_localhost: getBuildInfo.isLocalhost(uri),
    is_do: getBuildInfo.isDigitalOcean(uri),
    server_version: buildInfo.version,
    node_version: process.version,
    mongosh_version: mongoshVersion,
    server_os,
    uri,
    server_arch,
    is_enterprise: getBuildInfo.isEnterprise(buildInfo),
    auth_type,
    is_data_federation,
    dl_version,
    atlas_version: atlasVersion?.atlasVersion ?? null,
    is_genuine,
    non_genuine_server_name,
  };
}
