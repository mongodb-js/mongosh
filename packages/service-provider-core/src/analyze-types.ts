import type { WriteConcern } from './all-transport-types';

export type AnalyzeOptions = {
  key?: string;
  writeConcern?: WriteConcern;
  sampleRate?: number;
  sampleSize?: number;
};
