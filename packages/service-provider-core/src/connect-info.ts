// ^ segment data is in snake_case: forgive me javascript, for i have sinned.

import getBuildInfo from 'mongodb-build-info';

export type ConnectionExtraInfo = {
  is_atlas?: boolean;
  atlas_hostname?: string | null;
  server_version?: string;
  mongosh_version?: string;
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
  is_public_cloud?: boolean;
  public_cloud_name?: string;
};

async function getPublicCloudInfo(host: string): Promise<{
  public_cloud_name?: string;
  is_public_cloud?: boolean;
}> {
  try {
    const { getCloudInfo } = await import('mongodb-cloud-info');
    const { isAws, isAzure, isGcp } = await getCloudInfo(host);

    const public_cloud_name = isAws
      ? 'AWS'
      : isAzure
      ? 'Azure'
      : isGcp
      ? 'GCP'
      : undefined;

    if (public_cloud_name === undefined) {
      return { is_public_cloud: false };
    }

    return {
      is_public_cloud: true,
      public_cloud_name,
    };
  } catch (err) {
    // Cannot resolve dns used by mongodb-cloud-info in the browser environment.
    return {};
  }
}

async function getHostInformation(
  host: string | null
): Promise<HostInformation> {
  if (!host) {
    return {
      is_do_url: false,
      is_atlas_url: false,
      is_localhost: false,
    };
  }

  if (getBuildInfo.isLocalhost(host)) {
    return {
      is_public_cloud: false,
      is_do_url: false,
      is_atlas_url: false,
      is_localhost: true,
    };
  }

  if (getBuildInfo.isDigitalOcean(host)) {
    return {
      is_localhost: false,
      is_public_cloud: false,
      is_atlas_url: false,
      is_do_url: true,
    };
  }

  const publicCloudInfo = await getPublicCloudInfo(host);

  return {
    is_localhost: false,
    is_do_url: false,
    is_atlas_url: getBuildInfo.isAtlas(host),
    ...publicCloudInfo,
  };
}

export default async function getConnectExtraInfo(
  uri: string,
  mongoshVersion: string,
  buildInfo: any,
  atlasVersion: any,
  topology: any,
  isLocalAtlas: boolean,
  resolvedHostname: string | null
): Promise<ConnectionExtraInfo> {
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
  const isAtlas = !!atlasVersion?.atlasVersion || getBuildInfo.isAtlas(uri);

  return {
    ...(await getHostInformation(resolvedHostname)),
    is_atlas: isAtlas,
    atlas_hostname: isAtlas ? resolvedHostname : null,
    server_version: buildInfo.version,
    node_version: process.version,
    mongosh_version: mongoshVersion,
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
