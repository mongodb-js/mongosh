export enum ServerVersions {
  latest = '4.4.0',
  earliest = '0.0.0'
}

export enum Topologies {
  ReplSet = 0,
  Standalone = 1,
  Sharded = 2
}

export enum ReplPlatform {
  Compass,
  Browser,
  CLI
}

export const ALL_SERVER_VERSIONS = [ ServerVersions.earliest, ServerVersions.latest ];
export const ALL_TOPOLOGIES = [ Topologies.ReplSet, Topologies.Sharded, Topologies.Standalone ];
export const ALL_PLATFORMS = [ ReplPlatform.Compass, ReplPlatform.Browser, ReplPlatform.CLI ];

export enum ReadPreference {
  PRIMARY = 0,
  PRIMARY_PREFERRED = 1,
  SECONDARY = 2,
  SECONDARY_PREFERRED = 3,
  NEAREST = 4
}

export enum DBQueryOption {
  tailable = 2,
  slaveOk = 4,
  oplogReplay = 8,
  noTimeout = 16,
  awaitData = 32,
  exhaust = 64,
  partial = 128
}

export const DBQuery = {
  Option: DBQueryOption
};

