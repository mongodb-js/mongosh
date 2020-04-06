export class ShowDbsResult {
  private value: string;

  constructor({ value }: {value: string}) {
    this.value = value;
  }

  shellApiType(): string {
    return 'ShowDbsResult';
  }

  toReplString(): string {
    return this.value;
  }
}
