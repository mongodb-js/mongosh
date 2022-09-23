import type { WriteConcern } from './all-transport-types';
import { bson } from './index';

export type StatisticsDocumentHistogram = [{
	upperBoundary: typeof bson[keyof typeof bson];
	boundaryCount: number;
	rangeCount: number;
	rangeDistincts: number;
	cumulativeCount: number;
	cumulativeDistincts: number;
}];

export type StatisticsDocumentTypeCount = { [key: string]: number };

export type StatisticsDocumentBoolCount = { true: number; false: number; };

export interface StatisticsDocument {
  key: string;
  lastUpdate: typeof bson.Timestamp;
  documents: number;
  documentsSampled: number;
  samplingRate: number;
  samplesRequested: number;
  typeCount: StatisticsDocumentTypeCount;
  boolCount: StatisticsDocumentBoolCount;
  scalarHistogram: StatisticsDocumentHistogram;
  arrayStatistics : {
    minHistogram: StatisticsDocumentHistogram;
    maxHistogram: StatisticsDocumentHistogram;
    uniqueHistogram: StatisticsDocumentHistogram;
    typeCount: StatisticsDocumentTypeCount;
    boolCount: StatisticsDocumentBoolCount;
  };
}

export type AnalyzeOptions = {
  key: string;
  writeConcern?: WriteConcern;
} & ({ sampleRate?: number } | { sampleSize?: number });
