import { types as shellTypes } from '@mongosh/shell-api';
import semver from 'semver';
import {
  CONVERSION_OPERATORS,
  EXPRESSION_OPERATORS,
  STAGE_OPERATORS,
  QUERY_OPERATORS,
  ACCUMULATORS,
  BSON_TYPES } from 'mongodb-ace-autocompleter'

const BASE_COMPLETIONS = EXPRESSION_OPERATORS.concat(
  CONVERSION_OPERATORS.concat(BSON_TYPES.concat(STAGE_OPERATORS)
));

const MATCH_COMPLETIONS = QUERY_OPERATORS.concat(BSON_TYPES);

const SHELL_COMPLETIONS = shellTypes.ShellApi.attributes;
const COLL_COMPLETIONS = shellTypes.Collection.attributes;
const AGG_CURSOR_COMPLETIONS = shellTypes.AggregationCursor.attributes;
const COLL_CURSOR_COMPLETIONS = shellTypes.Cursor.attributes;
const RS_COMPLETIONS = shellTypes.ReplicaSet.attributes;
const SHARD_COMPLETE = shellTypes.Shard.attributes;

/**
 * The proect stage operator.
 */
const PROJECT = '$project';

/**
 * The group stage operator.
 */
const GROUP = '$group';

/**
 * The match operator.
 */
const MATCH = '$match';

/**
 * The dollar const.
 */
const DOLLAR = '$';

/**
 * Return complete suggestions given currently typed line
 *
 * @param {string} Line - Current user input.
 *
 * @returns {array} Matching Completions, Current User Input.
 */
function completer(mdbVersion: string, line: string): [string[], string] {
  // keep initial line param intact to always return in return statement
  // check for contents of line with:
  const splitLine = line.split('.');
  const firstLineEl = splitLine[0];
  const elToComplete = splitLine[splitLine.length-1];

  // suggest SHELLAPI commands
  if (splitLine.length <= 1) {
    // TODO: this should also explicitly suggest 'sh', 'rs', and 'db' strings
    const hits = filterShellAPI(mdbVersion, SHELL_COMPLETIONS, elToComplete);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('db') && splitLine.length === 2) {
    // TODO: @lrlna suggest DATABASE commands (currently not available in
    // shellTypes)
    // TODO: @lrlna is there a way to suggest currently available collections?
    return [[], line];
  } else if (firstLineEl.includes('db') && splitLine.length > 2) {
    if (splitLine.length > 3) {
      // aggregation cursor completions
      if (splitLine[2].includes('aggregate')) {
        const hits = filterShellAPI(
          mdbVersion, AGG_CURSOR_COMPLETIONS, elToComplete, splitLine);
        return [hits.length ? hits: [], line];
      }
      // collection cursor completions
      const hits = filterShellAPI(
        mdbVersion, COLL_CURSOR_COMPLETIONS, elToComplete, splitLine);
      return [hits.length ? hits : [], line];
    }

    // complete aggregation and collection  queries/stages
    if (splitLine[2].includes('([') || splitLine[2].includes('({')) {
      let expressions;
      if (splitLine[2].includes('aggregate')) {
        // aggregation needs extra accumulators to autocomplete properly
        expressions = BASE_COMPLETIONS.concat(getStageAccumulators(
          elToComplete, mdbVersion));
      } else {
        // collection quering just needs MATCH COMPLETIONS
        expressions = MATCH_COMPLETIONS;
      }
      // split on {, as a stage/query will always follow an open curly brace
      const splitQuery = line.split("{");
      const prefix = splitQuery.pop().trim();
      const command = line.split(prefix).shift();
      const hits = filterQueries(mdbVersion, expressions, prefix, command);
      return [hits.length ? hits: [], line]
    }

    const hits = filterShellAPI(
      mdbVersion, COLL_COMPLETIONS, elToComplete, splitLine);
    return [hits.length ? hits: [], line];
  } else if (firstLineEl.includes('sh')) {
    const hits = filterShellAPI(
      mdbVersion, SHARD_COMPLETE, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('rs')) {
    const hits = filterShellAPI(
      mdbVersion, RS_COMPLETIONS, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  }

  return [[line], line];
}

// stage completions based on current stage string.
function getStageAccumulators(stage: string, mdbVersion: string) {
  if (stage !== '') return [] ;

  if (stage.includes(PROJECT)) {
    return ACCUMULATORS.filter(acc => {
      return (
        acc.projectVersion && semver.gte(mdbVersion, acc.projectVersion)
      );
    });
  } else if (stage.includes(GROUP)) {
    return ACCUMULATORS;
  }
}

function filterQueries(mdbVersion: string, completions: any, prefix: string, split: string) {
  const hits = completions.filter((e) => {
    if (!e.name) return false;
    return e.name.startsWith(prefix) && semver.gte(mdbVersion, e.version);
  })

  const adjusted = hits.map(h => `${split}${h.name}`);
  return adjusted;
}

function filterShellAPI(mdbVersion: string, completions: object, prefix: string, split?: string[]) {
  const hits = Object.keys(completions).filter((c) => {
    return c.startsWith(prefix)
      && semver.gte(mdbVersion, completions[c].serverVersions[0])
      && semver.lte(mdbVersion, completions[c].serverVersions[1])
  });

  if (split) {
    const adjusted = hits.map(h => `${split.slice(0, -1).join('.')}.${h}`);
    return adjusted;
  }

  return hits;
}

export default completer;
