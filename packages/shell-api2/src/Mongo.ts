export default class Mongo {
  shellState: any;

  constructor(shellState) {
    this.shellState = shellState;
  }
  it() {
    this.shellState.it();
  }
}

