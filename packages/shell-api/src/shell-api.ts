import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass, returnsPromise,
} from './decorators';
import { CursorIterationResult } from './result';
import ShellInternalState from './shell-internal-state';

@shellApiClassDefault
@hasAsyncChild
export default class ShellApi extends ShellApiClass {
  private internalState: ShellInternalState;

  constructor(internalState) {
    super();
    this.internalState = internalState;
  }

  use(db): any {
    return this.internalState.currentDb.mongo.use(db);
  }
  show(arg): any {
    return this.internalState.currentDb.mongo.show(arg);
  }

  @returnsPromise
  async it(): Promise<any> {
    if (!this.internalState.currentCursor) {
      // TODO: warn here
      return new CursorIterationResult();
    }
    return await this.internalState.currentCursor._it();
  }
}
