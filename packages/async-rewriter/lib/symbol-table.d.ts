export default class SymbolTable {
    readonly scopeStack: any;
    constructor(initialScope: any);
    lookup(item: any): any;
    add(item: any, value: any): void;
    popScope(): void;
    pushScope(): void;
    printSymbol(s: any, i: any): void;
    print(): void;
}
