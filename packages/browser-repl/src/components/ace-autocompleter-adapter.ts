import { Autocompleter, Completion } from '../autocompleter/autocompleter';

interface AceCompletion {
  caption: string;
  value: string;
}

/**
 * @private
 *
 * Adapts an Autocompleter instance to comply with the ACE Editor
 * interface.
 */
export class AceAutocompleterAdapter {
  private adaptee;

  constructor(adaptee: Autocompleter) {
    this.adaptee = adaptee;
  }

  getCompletions = (editor, session, position, prefix, done): void => {
    // ACE wont include '.' in the prefix, so we have to extract a new prefix
    // including dots to be passed to the autocompleter.
    const code = session.getLine(position.row)
      .substring(0, position.column)
      .split(/\s+/)
      .pop();

    this.adaptee.getCompletions(code)
      .then((completions) => {
        done(null, completions.map(this.adaptCompletion));
      })
      .catch(done);
  }

  adaptCompletion = (completion: Completion): AceCompletion => {
    // We convert the completion to the ACE editor format by taking only
    // the last part. ie (db.coll1.find -> find)

    const value = completion.completion.split('.').pop();

    return {
      caption: value,
      value: value
    };
  }
}
