import { hasAsyncChild, returnsPromise, ShellApiClass, shellApiClassDefault } from './decorators';
import { CursorIterationResult } from './result';
import ShellInternalState from './shell-internal-state';
import { ReplPlatform } from '@mongosh/service-provider-core';
import { MongoshUnimplementedError } from '@mongosh/errors';

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
  async exit(): Promise<void> {
    await this.internalState.close(true);
    if (this.internalState.initialServiceProvider.platform === ReplPlatform.CLI) {
      process.exit();
    } else {
      throw new MongoshUnimplementedError(
        `exit not supported for current platform: ${ReplPlatform[this.internalState.initialServiceProvider.platform]}`
      );
    }
  }

  @returnsPromise
  async it(): Promise<any> {
    if (!this.internalState.currentCursor) {
      return new CursorIterationResult();
    }
    return await this.internalState.currentCursor._it();
  }
}
