import getBuildInfo from 'mongodb-build-info';

export default function getConnectInfo(uri: string, buildInfo: any, cmdLineOpts: any, topology: any) {
  const { isGenuine, serverName } =
    getBuildInfo.getGenuineMongoDB(buildInfo, cmdLineOpts);
  const { isDataLake, dlVersion } = getBuildInfo.getDataLake(buildInfo);

  // get this information from topology rather than cmdLineOpts, since not all
  // connections are able to run getCmdLineOpts command
  const authType = topology.s.credentials
    ? topology.s.credentials.mechanism : null;

  return {
    isAtlas: getBuildInfo.isAtlas(uri),
    isLocalhost: getBuildInfo.isLocalhost(uri),
    serverVersion: buildInfo.version,
    isEnterprise: getBuildInfo.isEnterprise(buildInfo),
    uri,
    authType,
    isDataLake,
    dlVersion,
    isGenuine,
    serverName 
  }
}
