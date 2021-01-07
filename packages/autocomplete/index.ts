/* eslint complexity: 0, camelcase: 0, no-nested-ternary: 0 */

import { signatures as shellSignatures, Topologies } from '@mongosh/shell-api';
import semver from 'semver';
import {
  CONVERSION_OPERATORS,
  EXPRESSION_OPERATORS,
  STAGE_OPERATORS,
  QUERY_OPERATORS,
  ACCUMULATORS,
  BSON_TYPES,
  ATLAS,
  ADL,
  ON_PREM
} from 'mongodb-ace-autocompleter';

export interface AutocompleteParameters {
  topology: () => Topologies;
  connectionInfo: () => undefined | {
    is_atlas: boolean;
    is_data_lake: boolean;
    server_version: string;
  };
}

export const BASE_COMPLETIONS = EXPRESSION_OPERATORS.concat(
  CONVERSION_OPERATORS.concat(BSON_TYPES.concat(STAGE_OPERATORS)
  ));

export const MATCH_COMPLETIONS = QUERY_OPERATORS.concat(BSON_TYPES);

/**
 * The project stage operator.
 */
const PROJECT = '$project';

/**
 * The group stage operator.
 */
const GROUP = '$group';

/**
 * Return complete suggestions given currently typed line
 *
 * @param {AutocompleteParameters} params - Relevant information about the current connection.
 * @param {string} line - Current user input.
 *
 * @returns {array} Matching Completions, Current User Input.
 */
async function completer(params: AutocompleteParameters, line: string): Promise<[string[], string]> {
  const SHELL_COMPLETIONS = shellSignatures.ShellApi.attributes;
  const COLL_COMPLETIONS = shellSignatures.Collection.attributes;
  const DB_COMPLETIONS = shellSignatures.Database.attributes;
  const AGG_CURSOR_COMPLETIONS = shellSignatures.AggregationCursor.attributes;
  const COLL_CURSOR_COMPLETIONS = shellSignatures.Cursor.attributes;
  const RS_COMPLETIONS = shellSignatures.ReplicaSet.attributes;
  const SHARD_COMPLETE = shellSignatures.Shard.attributes;

  // keep initial line param intact to always return in return statement
  // check for contents of line with:
  const splitLine = line.split('.');
  const firstLineEl = splitLine[0];
  const elToComplete = splitLine[splitLine.length - 1];

  if (splitLine.length <= 1) {
    const hits = filterShellAPI(params, SHELL_COMPLETIONS, elToComplete);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('db') && splitLine.length === 2) {
    const hits = filterShellAPI(params, DB_COMPLETIONS, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('db') && splitLine.length > 2) {
    if (splitLine.length > 3) {
      // aggregation cursor completions
      if (splitLine[2].includes('aggregate')) {
        const hits = filterShellAPI(
          params, AGG_CURSOR_COMPLETIONS, elToComplete, splitLine);
        return [hits.length ? hits : [], line];
      }
      // collection cursor completions
      const hits = filterShellAPI(
        params, COLL_CURSOR_COMPLETIONS, elToComplete, splitLine);
      return [hits.length ? hits : [], line];
    }

    // complete aggregation and collection  queries/stages
    if (splitLine[2].includes('([') || splitLine[2].includes('({')) {
      let expressions;
      if (splitLine[2].includes('aggregate')) {
        // aggregation needs extra accumulators to autocomplete properly
        expressions = BASE_COMPLETIONS.concat(getStageAccumulators(
          params, elToComplete));
      } else {
        // collection querying just needs MATCH COMPLETIONS
        expressions = MATCH_COMPLETIONS;
      }
      // split on {, as a stage/query will always follow an open curly brace
      const splitQuery = line.split('{');
      const prefix = splitQuery.pop()?.trim();
      const command: string = prefix ? line.split(prefix).shift() as string : line;
      const hits = filterQueries(params, expressions, prefix || '', command);
      return [hits.length ? hits : [], line];
    }

    const hits = filterShellAPI(
      params, COLL_COMPLETIONS, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('sh')) {
    const hits = filterShellAPI(
      params, SHARD_COMPLETE, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('rs')) {
    const hits = filterShellAPI(
      params, RS_COMPLETIONS, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  }

  return [[line], line];
}

function isAcceptable(
  params: AutocompleteParameters,
  entry: { version?: string; projectVersion?: string; env?: string[]; },
  versionKey: 'version' | 'projectVersion') {
  const connectionInfo = params.connectionInfo();
  const isAcceptableVersion =
    !entry[versionKey] ||
    !connectionInfo ||
    semver.gte(connectionInfo.server_version, entry[versionKey] as string);
  const isAcceptableEnvironment =
    !entry.env ||
    !connectionInfo ||
    (connectionInfo.is_data_lake ? entry.env.includes(ADL) :
      connectionInfo.is_atlas ? entry.env.includes(ATLAS) :
        entry.env.includes(ON_PREM));
  return isAcceptableVersion && isAcceptableEnvironment;
}

// stage completions based on current stage string.
function getStageAccumulators(params: AutocompleteParameters, stage: string): typeof ACCUMULATORS {
  if (stage !== '') return [];

  if (stage.includes(PROJECT)) {
    return ACCUMULATORS.filter((acc: any) => {
      return isAcceptable(params, acc, 'projectVersion');
    });
  } else if (stage.includes(GROUP)) {
    return ACCUMULATORS;
  }
}

function filterQueries(params: AutocompleteParameters, completions: any, prefix: string, split: string): string[] {
  const hits: any[] = completions.filter((e: any) => {
    return e.name && e.name.startsWith(prefix) && isAcceptable(params, e, 'version');
  });

  return hits.map(h => `${split}${h.name}`);
}

function filterShellAPI(params: AutocompleteParameters, completions: any, prefix: string, split?: string[]): string[] {
  const hits: string[] = Object.keys(completions).filter((c: any) => {
    if (!c.startsWith(prefix)) return false;
    const serverVersion = params.connectionInfo()?.server_version;
    if (!serverVersion) return true;
    const isAcceptableVersion =
      (semver.gte(serverVersion, completions[c].serverVersions[0]) &&
       semver.lte(serverVersion, completions[c].serverVersions[1]));
    const isAcceptableTopology =
      !completions[c].topologies ||
      completions[c].topologies.includes(params.topology());
    return isAcceptableVersion && isAcceptableTopology;
  });

  if (split) {
    return hits.map(h => `${split.slice(0, -1).join('.')}.${h}`);
  }

  return hits;
}

export default completer;
