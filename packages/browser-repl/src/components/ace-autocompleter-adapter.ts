import { Autocompleter } from '../lib/autocompleter/autocompleter';

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
    const code = session.getLine(position.row)
      .substring(0, position.column)
      .split(/\s+/)
      .pop();

    this.adaptee.getCompletions(code)
      .then((completions) => {
        done(null, completions);
      })
      .catch(done);
  }
}
