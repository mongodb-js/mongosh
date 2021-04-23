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

  get batchSize(): number | undefined {
    return this._internalState.batchSizeFromDBQuery;
  }

  set batchSize(value: number | undefined) {
    printDeprecationWarning(
      'DBQuery.batchSize is deprecated, please use \'batchSize\' on the cursor instead: db.coll.find().batchSize(<size>)');
    this._internalState.batchSizeFromDBQuery = value;
  }
}
