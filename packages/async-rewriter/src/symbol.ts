export default class Symbol {
    public name: string;
    public type: any;
    public attr: any;
    constructor(name, type, args) {
      this.name = name;
      this.type = type === undefined ? 'Unknown' : type;
      this.attr = args;
    }
}


