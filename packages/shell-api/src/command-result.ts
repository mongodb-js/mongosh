export class CommandResult {
  private value: string;

  constructor({value}: {value: string}) {
    this.value = value;
  }

  shellApiType() {
    return 'CommandResult';
  }

  toReplString(): string {
    return this.value;
  }
}
