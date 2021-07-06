import {
  ShellApiClass,
  shellApiClassDefault,
  classDeprecated
} from './decorators';
import { printDeprecationWarning } from './deprecation-warning';
import ShellInternalState from './shell-internal-state';

@shellApiClassDefault
@classDeprecated
export class DBQuery extends ShellApiClass {
  _internalState: ShellInternalState;

  constructor(internalState: ShellInternalState) {
    super();
    this._internalState = internalState;
  }

  get shellBatchSize(): number | undefined {
    return this._internalState.displayBatchSizeFromDBQuery;
  }

  set shellBatchSize(value: number | undefined) {
    printDeprecationWarning(
      'DBQuery.shellBatchSize is deprecated, please use config.set("displayBatchSize") instead');
    this._internalState.displayBatchSizeFromDBQuery = value;
  }
}
