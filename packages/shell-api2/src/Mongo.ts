export default class Mongo {
  shellState: any;

  constructor(shellState) {
    this.shellState = shellState;
  }
  it(): void {
    this.shellState.it();
  }
}

