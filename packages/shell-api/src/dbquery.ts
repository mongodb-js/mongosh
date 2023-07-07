import {
  ShellApiClass,
  shellApiClassDefault,
  classDeprecated,
} from './decorators';
import type ShellInstanceState from './shell-instance-state';

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
    void this._instanceState.printDeprecationWarning(
      'DBQuery.shellBatchSize is deprecated, please use config.set("displayBatchSize") instead'
    );
    this._instanceState.displayBatchSizeFromDBQuery = value;
  }
}
