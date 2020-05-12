import { Cursor } from './cursor';

export class ShellIterationState {
  private _cursor: Cursor;

  setCursor(cursor: Cursor): void {
    if (this._cursor) {
      this._cursor.close();
    }

    this._cursor = cursor;
  }

  getCursor(): Cursor {
    return this._cursor;
  }
}

