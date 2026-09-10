// The telemetry format came from legacy Segment, which stores data in snake_case.
// Forgive me javascript, for i have sinned.

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
  is_srv?: boolean;
  topology_type?: string;
  is_csfle?: boolean;
  has_csfle_schema?: boolean;
  connection_id?: string;
} & HostInformation;

export type HostInformation = {
  is_localhost?: boolean;
  is_atlas_url?: boolean;
  is_do_url?: boolean; // Is digital ocean url.
};

// Strips the port from a `host:port` address. IPv6 hosts are returned in
// bracketed form, which is what `mongodb-build-info` matches against, and which
// the driver's `hostAddress.host` does not use.
function extractHostname(address?: string): string | undefined {
  if (!address) {
    return undefined;
  }

  if (address.startsWith('[')) {
    const host = address.slice(1).split(']')[0];
    return host ? `[${host}]` : undefined;
  }

  // A bare IPv6 address has more than one colon, so it has no port to strip.
  if (address.indexOf(':') !== address.lastIndexOf(':')) {
    return `[${address}]`;
  }

  return address.split(':')[0] || undefined;
}

// Prefers the address of the server we actually talked to, falling back to the
// seed host from the connection string when the topology has not been populated.
// Both sources are credential-free, unlike the connection string itself.
function getResolvedHostname(
  resolvedHostname?: string,
  connectionString?: ConnectionString
): string | undefined {
  return (
    extractHostname(resolvedHostname) ??
    extractHostname(connectionString?.hosts[0])
  );
}

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
    ...getHostInformation(
      getResolvedHostname(resolvedHostname, connectionString)
    ),
    is_atlas: isAtlas,
    is_srv: connectionString?.isSRV,
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
