export class History {
  private entries: string[];
  private index: number;
  private hasDirtyLastValue = false;

  constructor(initialEntries: string[]) {
    this.entries = initialEntries || [];
    this.index = this.entries.length;
  }

  commit(value: string): void {
    if (this.hasDirtyLastValue) {
      this.entries.pop();
    }

    this.entries.push(value);
    this.index = this.entries.length;
    this.hasDirtyLastValue = false;
  }

  back(currentValue: string): string {
    if (this.index <= 0) {
      return;
    }

    if (this.hasDirtyLastValue && this.index === this.entries.length - 1) {
      // if already went up once and back down we will
      // replace the last entry
      this.entries.pop();
    }

    if (this.index === this.entries.length) {
      // if we are in the new line
      // we save the entry in the history temporarily

      this.hasDirtyLastValue = true;
      this.entries.push(currentValue);
    }

    this.index--;
    const previousValue = this.entries[this.index];

    return previousValue;
  }

  next(): string {
    if (this.index >= this.entries.length - 1) {
      return;
    }

    this.index++;

    const nextValue = this.entries[this.index];

    return nextValue;
  }
}
