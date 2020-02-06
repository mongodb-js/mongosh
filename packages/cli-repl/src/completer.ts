import { types as shellTypes } from 'mongosh-shell-api';
import semver from 'semver';

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

  const shellComplete = shellTypes.ShellApi.attributes;
  const collComplete = shellTypes.Collection.attributes;
  const aggCursorComplete = shellTypes.AggregationCursor.attributes;
  const collCursorComplete = shellTypes.Cursor.attributes;
  const rsComplete = shellTypes.ReplicaSet.attributes;
  const shardComplete = shellTypes.Shard.attributes;

  // suggest SHELLAPI commands
  if (splitLine.length <= 1) {
    // TODO: this should also explicitly suggest 'sh', 'rs', and 'db' strings
    const hits = filterComplete(mdbVersion, shellComplete, elToComplete);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('db') && splitLine.length === 2) {
    // TODO: @lrlna suggest DATABASE commands (currently not available in
    // shellTypes)
    // TODO: @lrlna is there a way to suggest currently available collections?
    return [[], line];
  } else if (firstLineEl.includes('db') && splitLine.length > 2) {
    if (splitLine.length > 3) {
      if (splitLine[2].includes('aggregate')) {
        const hits = filterComplete(mdbVersion, aggCursorComplete, elToComplete, splitLine);
        return [hits.length ? hits: [], line];
      }
      const hits = filterComplete(mdbVersion, collCursorComplete, elToComplete, splitLine);
      return [hits.length ? hits : [], line];
    }
    // if splitLine[2] === 'aggregate' && splitLine[2].contains('({'), suggest
    // aggregation operators from 'ace-autocompleter'

    // if splitLine[2].contains(any of the collComplete), and
    // .contains('({'), suggest query operators from 'ace-autocompleter'

    // else:
    const hits = filterComplete(mdbVersion, collComplete, elToComplete, splitLine);
    return [hits.length ? hits: [], line];
  } else if (firstLineEl.includes('sh')) {
    const hits = filterComplete(mdbVersion, shardComplete, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('rs')) {
    const hits = filterComplete(mdbVersion, rsComplete, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  }

  return [[line], line];
}

// TODO: @lrlna this should also take this.shellApi.version of sorts and also
// match on version:
// semver.gte(version, .version)
function filterComplete(mdbVersion: string, completions: object, toMatchTo: string, split?:
                        string[]) {
  const hits = Object.keys(completions).filter((c) => {
    return c.startsWith(toMatchTo)
      && semver.gte(mdbVersion, completions[c].serverVersions[0])
      && semver.lte(mdbVersion, completions[c].serverVersions[1])
  });

  if (split) {
    const adjusted = hits.map(h => `${split.slice(0, -1).join('.')}.${h}`);
    return adjusted;
    // if (!e.name) return false;
    // return e.name.startsWith(prefix) && semver.gte(version, e.version);
  }

  return hits;
}

export default completer;
