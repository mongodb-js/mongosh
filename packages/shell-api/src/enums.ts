export const ServerVersions = {
  latest: '999.999.999', // set a really high max value
  earliest: '0.0.0',
} as const;
export const ALL_SERVER_VERSIONS = [
  ServerVersions.earliest,
  ServerVersions.latest,
];

export const ALL_TOPOLOGIES = [
  'ReplSet',
  'Standalone',
  'Sharded',
  'LoadBalanced',
] as const;
export type Topologies = (typeof ALL_TOPOLOGIES)[number];

import type { ReplPlatform } from '@mongosh/service-provider-core';

export const ALL_PLATFORMS: ReplPlatform[] = ['Compass', 'Browser', 'CLI'];
export const ALL_API_VERSIONS = [0, Infinity];

export const CURSOR_FLAGS = {
  2: 'tailable',
  4: 'SlaveOk',
  8: 'oplogReplay',
  16: 'noTimeout',
  32: 'awaitData',
  64: 'exhaust',
  128: 'partial',
};

export const shellApiType = Symbol.for('@@mongosh.shellApiType');
export const asPrintable = Symbol.for('@@mongosh.asPrintable');
export const namespaceInfo = Symbol.for('@@mongosh.namespaceInfo');

export const ADMIN_DB = 'admin';
