import type { Topologies, TypeSignature } from '@mongosh/shell-api';
import { signatures as shellSignatures } from '@mongosh/shell-api';
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
  ON_PREM,
  DATABASE,
} from '@mongodb-js/mongodb-constants';

type TypeSignatureAttributes = { [key: string]: TypeSignature };

export interface AutocompleteParameters {
  topology: () => Topologies;
  connectionInfo: () =>
    | undefined
    | {
        is_atlas?: boolean;
        is_data_federation?: boolean;
        server_version?: string;
        is_local_atlas?: boolean;
      };
  apiVersionInfo: () => { version: string; strict: boolean } | undefined;
  getCollectionCompletionsForCurrentDb: (
    collName: string
  ) => string[] | Promise<string[]>;
  getDatabaseCompletions: (dbName: string) => string[] | Promise<string[]>;
}

type AnyCompletions = readonly (
  | (typeof CONVERSION_OPERATORS)[number]
  | (typeof EXPRESSION_OPERATORS)[number]
  | (typeof STAGE_OPERATORS)[number]
  | (typeof QUERY_OPERATORS)[number]
  | (typeof ACCUMULATORS)[number]
  | (typeof BSON_TYPES)[number]
)[];

export const BASE_COMPLETIONS = ([] as AnyCompletions).concat(
  EXPRESSION_OPERATORS,
  CONVERSION_OPERATORS,
  BSON_TYPES,
  STAGE_OPERATORS
);

export const MATCH_COMPLETIONS = ([] as AnyCompletions).concat(
  QUERY_OPERATORS,
  BSON_TYPES
);

// Note: The following list is not a list of all the completions
// for `db.aggregate` but only for the first stage of `db.aggregate`.
const DB_AGGREGATE_COMPLETIONS = STAGE_OPERATORS.filter(({ namespaces }) => {
  return namespaces.length === 1 && namespaces[0] === DATABASE;
});

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
async function completer(
  params: AutocompleteParameters,
  line: string
): Promise<[string[], string, 'exclusive'] | [string[], string]> {
  const SHELL_COMPLETIONS = shellSignatures.ShellApi
    .attributes as TypeSignatureAttributes;
  const COLL_COMPLETIONS = shellSignatures.Collection
    .attributes as TypeSignatureAttributes;
  const DB_COMPLETIONS = shellSignatures.Database
    .attributes as TypeSignatureAttributes;
  const AGG_CURSOR_COMPLETIONS = shellSignatures.AggregationCursor
    .attributes as TypeSignatureAttributes;
  const COLL_CURSOR_COMPLETIONS = shellSignatures.Cursor
    .attributes as TypeSignatureAttributes;
  const RS_COMPLETIONS = shellSignatures.ReplicaSet
    .attributes as TypeSignatureAttributes;
  const CONFIG_COMPLETIONS = shellSignatures.ShellConfig
    .attributes as TypeSignatureAttributes;
  const SHARD_COMPLETE = shellSignatures.Shard
    .attributes as TypeSignatureAttributes;
  const SP_COMPLETIONS = shellSignatures.Streams
    .attributes as TypeSignatureAttributes;
  const SP_INSTANCE_COMPLETIONS = shellSignatures.StreamProcessor
    .attributes as TypeSignatureAttributes;

  // Split at space-to-non-space transitions when looking at this as a command,
  // because multiple spaces (e.g. 'show  collections') are valid in commands.
  // This split keeps the spaces intact so we can join them back later.
  const splitLineWhitespace = line.split(/(?<!\S)(?=\S)/);
  const command = splitLineWhitespace[0].trim();
  if (SHELL_COMPLETIONS[command]?.isDirectShellCommand) {
    // If we encounter a direct shell commmand, we know that we want completions
    // specific to that command, so we set the 'exclusive' flag on the result.
    // If the shell API provides us with a completer, use it.
    const completer = SHELL_COMPLETIONS[command].shellCommandCompleter;
    if (completer) {
      if (splitLineWhitespace.length === 1) {
        if (splitLineWhitespace[0].trimEnd() === splitLineWhitespace[0]) {
          // Treat e.g. 'show' like 'show '.
          splitLineWhitespace[0] += ' ';
        }

        // Complete the first argument after the command.
        splitLineWhitespace.push('');
      }
      const hits =
        (await completer(
          params,
          splitLineWhitespace.map((item) => item.trim())
        )) || [];
      // Adjust to full input, because `completer` only completed the last item
      // in the line, e.g. ['profile'] -> ['show profile']
      const fullLineHits = hits.map((hit) =>
        [...splitLineWhitespace.slice(0, -1), hit].join('')
      );
      return [fullLineHits, line, 'exclusive'];
    }
    return [[line], line, 'exclusive'];
  }

  // keep initial line param intact to always return in return statement
  // check for contents of line with:
  const splitLine = line.split('.');
  const firstLineEl = splitLine[0];
  const elToComplete = splitLine[splitLine.length - 1];

  if (splitLine.length <= 1) {
    const hits = filterShellAPI(params, SHELL_COMPLETIONS, elToComplete);
    return [hits.length ? hits : [], line];
  } else if (/\bdb\b/.exec(firstLineEl) && splitLine.length === 2) {
    if (/aggregate\s*\(\s*\[\s*\{\s*/.exec(elToComplete)) {
      const splitQuery = line.split('{');
      const prefix = splitQuery.pop()?.trim() || '';
      const command: string = prefix
        ? (line.split(prefix).shift() as string)
        : line;
      const suggestFirstStage = splitQuery.length <= 2;

      const expressions = suggestFirstStage
        ? // First stage in `db.aggregate` form can only be 'db' namespaced stages
          DB_AGGREGATE_COMPLETIONS
        : [...BASE_COMPLETIONS, ...getStageAccumulators(params, elToComplete)];

      const hits = filterQueries(params, expressions, prefix, command);
      return [hits.length ? hits : [], line];
    }
    // We're seeing something like 'db.foo' and expand that to all methods on
    // db which start with 'foo' and all collections on the current db that
    // start with 'foo'.
    const hits = filterShellAPI(
      params,
      DB_COMPLETIONS,
      elToComplete,
      splitLine
    );
    const colls = await params.getCollectionCompletionsForCurrentDb(
      elToComplete.trim()
    );
    hits.push(...colls.map((coll) => `${splitLine[0]}.${coll}`));
    return [hits.length ? hits : [], line];
  } else if (/\bdb\b/.exec(firstLineEl) && splitLine.length > 2) {
    if (
      !/^\s*\w+\s*$/.exec(splitLine[1]) &&
      !/\bgetCollection\b/.exec(splitLine[1])
    ) {
      // The collection name contains something that is not whitespace or an
      // alphanumeric character. This could be a function call, for example.
      // In any case, we can't currently provide reasonable autocompletion
      // suggestions for this.
      return [[], line];
    }

    if (splitLine.length > 3) {
      // We're seeing something like db.coll.find().xyz or db.coll.aggregate().xyz
      if (/\baggregate\b/.exec(splitLine[2])) {
        // aggregation cursor completions
        const hits = filterShellAPI(
          params,
          AGG_CURSOR_COMPLETIONS,
          elToComplete,
          splitLine
        );
        return [hits.length ? hits : [], line];
      } else if (/\bfind\b/.exec(splitLine[2])) {
        // collection cursor completions
        const hits = filterShellAPI(
          params,
          COLL_CURSOR_COMPLETIONS,
          elToComplete,
          splitLine
        );
        return [hits.length ? hits : [], line];
      }
      // This is something else, and we currently don't know what this is.
      return [[], line];
    }

    // complete aggregation and collection  queries/stages
    if (splitLine[2].includes('([') || splitLine[2].includes('({')) {
      let expressions;
      if (/\baggregate\b/.exec(splitLine[2])) {
        // aggregation needs extra accumulators to autocomplete properly
        expressions = [
          ...BASE_COMPLETIONS,
          ...getStageAccumulators(params, elToComplete),
        ];
      } else {
        // collection querying just needs MATCH COMPLETIONS
        expressions = MATCH_COMPLETIONS;
      }
      // split on {, as a stage/query will always follow an open curly brace
      const splitQuery = line.split('{');
      const prefix = splitQuery.pop()?.trim();
      const command: string = prefix
        ? (line.split(prefix).shift() as string)
        : line;
      const hits = filterQueries(params, expressions, prefix || '', command);
      return [hits.length ? hits : [], line];
    }

    const hits = filterShellAPI(
      params,
      COLL_COMPLETIONS,
      elToComplete,
      splitLine
    );
    return [hits.length ? hits : [], line];
  } else if (/\bsh\b/.exec(firstLineEl) && splitLine.length === 2) {
    const hits = filterShellAPI(
      params,
      SHARD_COMPLETE,
      elToComplete,
      splitLine
    );
    return [hits.length ? hits : [], line];
  } else if (/\brs\b/.exec(firstLineEl) && splitLine.length === 2) {
    const hits = filterShellAPI(
      params,
      RS_COMPLETIONS,
      elToComplete,
      splitLine
    );
    return [hits.length ? hits : [], line];
  } else if (/\bconfig\b/.exec(firstLineEl) && splitLine.length === 2) {
    const hits = filterShellAPI(
      params,
      CONFIG_COMPLETIONS,
      elToComplete,
      splitLine
    );
    return [hits.length ? hits : [], line];
  } else if (/\bsp\b/.exec(firstLineEl)) {
    let expressions: TypeSignatureAttributes | undefined;
    if (splitLine.length === 2) {
      expressions = SP_COMPLETIONS;
    } else if (splitLine.length === 3) {
      // something like sp.spName.start()
      expressions = SP_INSTANCE_COMPLETIONS;
    }

    const hits =
      expressions &&
      filterShellAPI(params, expressions, elToComplete, splitLine);

    return [hits?.length ? hits : [], line];
  }

  return [[], line];
}

function isAcceptable(
  params: AutocompleteParameters,
  entry: {
    version?: string;
    projectVersion?: string;
    env?: string[];
    apiVersions?: number[];
  },
  versionKey: 'version' | 'projectVersion'
) {
  const connectionInfo = params.connectionInfo();
  const apiVersionInfo = params.apiVersionInfo();
  let isAcceptableVersion;
  if (apiVersionInfo?.strict && entry.apiVersions) {
    isAcceptableVersion = entry.apiVersions.includes(+apiVersionInfo.version);
  } else {
    isAcceptableVersion =
      !entry[versionKey] ||
      // TODO: when https://jira.mongodb.org/browse/PM-2327 is done we can rely on server_version being present
      !connectionInfo?.server_version ||
      semver.gte(connectionInfo.server_version, entry[versionKey] as string);
  }
  const isAcceptableEnvironment =
    !entry.env ||
    !connectionInfo ||
    (connectionInfo.is_data_federation
      ? entry.env.includes(ADL)
      : connectionInfo.is_atlas || connectionInfo.is_local_atlas
      ? entry.env.includes(ATLAS)
      : entry.env.includes(ON_PREM));
  return isAcceptableVersion && isAcceptableEnvironment;
}

// stage completions based on current stage string.
function getStageAccumulators(
  params: AutocompleteParameters,
  stage: string
): readonly (typeof ACCUMULATORS)[number][] {
  if (stage.includes(PROJECT)) {
    return ACCUMULATORS.filter((acc) => {
      return isAcceptable(params, acc, 'projectVersion');
    });
  } else if (stage.includes(GROUP)) {
    return ACCUMULATORS;
  }
  return [];
}

function filterQueries(
  params: AutocompleteParameters,
  completions: any,
  prefix: string,
  split: string
): string[] {
  const hits: any[] = completions.filter((e: any) => {
    return (
      e.name && e.name.startsWith(prefix) && isAcceptable(params, e, 'version')
    );
  });

  return hits.map((h) => `${split}${h.name}`);
}

function filterShellAPI(
  params: AutocompleteParameters,
  completions: { [key: string]: TypeSignature },
  prefix: string,
  split?: string[]
): string[] {
  const hits: string[] = Object.keys(completions).filter((c: string) => {
    if (!c.toLowerCase().startsWith(prefix.toLowerCase())) return false;
    if (completions[c].deprecated) return false;

    const apiVersionInfo = params.apiVersionInfo();
    let isAcceptableVersion;
    let acceptableApiVersions;
    if (
      apiVersionInfo?.strict &&
      (acceptableApiVersions = completions[c].apiVersions)
    ) {
      isAcceptableVersion =
        +apiVersionInfo.version >= acceptableApiVersions[0] &&
        +apiVersionInfo.version <= acceptableApiVersions[1];
    } else {
      const serverVersion = params.connectionInfo()?.server_version;
      if (!serverVersion) return true;

      const acceptableVersions = completions[c].serverVersions;
      isAcceptableVersion =
        !acceptableVersions ||
        (semver.gte(serverVersion, acceptableVersions[0]) &&
          semver.lte(serverVersion, acceptableVersions[1]));
    }

    const acceptableTopologies = completions[c].topologies;
    const isAcceptableTopology =
      !acceptableTopologies || acceptableTopologies.includes(params.topology());

    return isAcceptableVersion && isAcceptableTopology;
  });

  if (split) {
    return hits.map((h) => `${split.slice(0, -1).join('.')}.${h}`);
  }

  return hits;
}

export default completer;
