import {
  ShellApiClass,
  shellApiClassDefault,
  classDeprecated
} from './decorators';
import { printDeprecationWarning } from './deprecation-warning';
import ShellInstanceState from './shell-instance-state';

@shellApiClassDefault
@classDeprecated
export class DBQuery extends ShellApiClass {
  _instanceState: ShellInstanceState;

  constructor(instanceState: ShellInstanceState) {
    super();
    this._instanceState = instanceState;
  }

  get shellBatchSize(): number | undefined {
    return this._instanceState.displayBatchSizeFromDBQuery;
  }

  set shellBatchSize(value: number | undefined) {
    printDeprecationWarning(
      'DBQuery.shellBatchSize is deprecated, please use config.set("displayBatchSize") instead');
    this._instanceState.displayBatchSizeFromDBQuery = value;
  }
}
