import { CliServiceProvider } from '@mongosh/service-provider-server';
import getBuildInfo from '../../../../mongodb-build-info';
import Nanobus from 'nanobus';

export default async function getConnectInfo(uri: string, serviceProvider: CliServiceProvider, bus: Nanobus) {
  const buildInfo = await serviceProvider.buildInfo();
  // wrap in a try/catch since for some connections with no authentication,
  // cmdLineOpts cannot be run.
  let cmdLineOpts = undefined;
  try {
    cmdLineOpts = await serviceProvider.getCmdLineOpts();
  } catch (e) {
    // don't throw this one, as this command is just used for logging
    // non-genuine mongodb connections.
    bus.emit('mongodb:error', e)
  }
  const topology = serviceProvider.getTopology();
  const { isGenuine, serverName } =
    getBuildInfo.isGenuineMongoDB(buildInfo, cmdLineOpts);
  const { isDataLake, dlVersion } = getBuildInfo.isDataLake(buildInfo);

  const authType = topology.s.credentials
    ? topology.s.credentials.mechanism : null;

  return {
    isAtlas: getBuildInfo.isAtlas(uri),
    isLocalhost: getBuildInfo.isLocalhost(uri),
    serverVersion: buildInfo.version,
    isEnterprise: getBuildInfo.isEnterprise(buildInfo),
    authType,
    isDataLake,
    dlVersion,
    isGenuine,
    serverName 
  }
}
