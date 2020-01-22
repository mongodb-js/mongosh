import { types as shellTypes } from 'mongosh-shell-api';
/**
 * Return complete suggestions given currently typed line
 *
 * @param {any} output - The output.
 *
 * @returns {string} The output.
 */
function completer(line: string): any {
  // keep initial line param intact to always return in return statement
  // check for contents of line with:
  const splitLine = line.split('.');
  const firstLineEl = splitLine[0];
  const elToComplete = splitLine[splitLine.length-1];

  const shellComplete = Object.keys(shellTypes.ShellApi.attributes);
  const collComplete = Object.keys(shellTypes.Collection.attributes);
  const aggCursorComplete = Object.keys(shellTypes.AggregationCursor.attributes);
  const collCursorComplete = Object.keys(shellTypes.Cursor.attributes);
  const rsComplete = Object.keys(shellTypes.ReplicaSet.attributes);
  const shardComplete = Object.keys(shellTypes.Shard.attributes);

  // suggest SHELLAPI commands
  if (splitLine.length <= 1) {
    // TODO: this should also explicitly suggest 'sh', 'rs', and 'db' strings
    const hits = filterComplete(shellComplete, elToComplete);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('db') && splitLine.length === 2) {
    // TODO: @lrlna suggest DATABASE commands (currently not available in
    // shellTypes)
    // TODO: @lrlna is there a way to suggest currently available collections?
    return [[], line];
  } else if (firstLineEl.includes('db') && splitLine.length > 2) {
    if (splitLine.length > 3) {
      if (splitLine[2].includes('aggregate')) {
        const hits = filterComplete(aggCursorComplete, elToComplete, splitLine);
        return [hits.length ? hits: [], line];
      }
      const hits = filterComplete(collCursorComplete, elToComplete, splitLine);
      return [hits.length ? hits : [], line];
    }
    // if splitLine[2] === 'aggregate' && splitLine[2].contains('({'), suggest
    // aggregation operators from 'ace-autocompleter'

    // if splitLine[2].contains(any of the collComplete), and
    // .contains('({'), suggest query operators from 'ace-autocompleter'

    // else:
    const hits = filterComplete(collComplete, elToComplete, splitLine);
    return [hits.length ? hits: [], line];
  } else if (firstLineEl.includes('sh')) {
    const hits = filterComplete(shardComplete, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  } else if (firstLineEl.includes('rs')) {
    const hits = filterComplete(rsComplete, elToComplete, splitLine);
    return [hits.length ? hits : [], line];
  }

  return [[line], line];
}

// TODO: @lrlna this should also take this.shellApi.version of sorts and also
// match on version:
// semver.gte(version, .version)
function filterComplete(completions: string[], toMatchTo: string, split?:
                        string[]) {
  const hits = completions.filter((c) => c.startsWith(toMatchTo));
  if (split) {
    const adjusted = hits.map(h => `${split.slice(0, -1).join('.')}.${h}`);
    return adjusted;
  }

  return hits;
}

export default completer;
